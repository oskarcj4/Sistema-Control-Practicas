<?php

declare(strict_types=1);

require_once __DIR__ . '/file-storage.php';

/**
 * Guarda los archivos en un bucket de Amazon S3 (o compatible: MinIO, R2, DigitalOcean Spaces).
 *
 * No usa el SDK de AWS: firma las peticiones con AWS Signature V4 usando curl,
 * así el proyecto no necesita Composer.
 *
 *   STORAGE_S3_BUCKET     -> nombre del bucket
 *   STORAGE_S3_REGION     -> región (ej. us-east-1)
 *   STORAGE_S3_KEY        -> Access Key ID del usuario IAM
 *   STORAGE_S3_SECRET     -> Secret Access Key del usuario IAM
 *   STORAGE_S3_ENDPOINT   -> (opcional) endpoint propio para servicios compatibles;
 *                            si se define se usa estilo "path" (endpoint/bucket/llave)
 *   STORAGE_PUBLIC_URL    -> URL pública de los archivos
 *                            (ej. https://mi-bucket.s3.us-east-1.amazonaws.com o un dominio de CloudFront)
 *
 * El usuario IAM solo necesita s3:PutObject, s3:GetObject y s3:DeleteObject sobre el bucket.
 */
final class S3Storage extends BaseStorage
{
    private const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    private string $bucket;
    private string $region;
    private string $accessKey;
    private string $secretKey;
    private string $endpoint;
    private bool $pathStyle;

    public function __construct(
        string $bucket,
        string $region,
        string $accessKey,
        string $secretKey,
        string $publicUrl = '',
        string $endpoint = ''
    ) {
        foreach (['STORAGE_S3_BUCKET' => $bucket, 'STORAGE_S3_REGION' => $region, 'STORAGE_S3_KEY' => $accessKey, 'STORAGE_S3_SECRET' => $secretKey] as $name => $value) {
            if (trim($value) === '') {
                throw new StorageException("$name no está configurado");
            }
        }

        $this->bucket = trim($bucket);
        $this->region = trim($region);
        $this->accessKey = trim($accessKey);
        $this->secretKey = trim($secretKey);

        $endpoint = rtrim(trim($endpoint), '/');
        if ($endpoint === '') {
            # Estilo "virtual-hosted" de AWS: https://bucket.s3.region.amazonaws.com/llave
            $this->endpoint = "https://{$this->bucket}.s3.{$this->region}.amazonaws.com";
            $this->pathStyle = false;
        } else {
            # Servicios compatibles: https://endpoint/bucket/llave
            $this->endpoint = $endpoint;
            $this->pathStyle = true;
        }

        $defaultPublicUrl = $this->pathStyle ? $this->endpoint . '/' . $this->bucket : $this->endpoint;
        parent::__construct(trim($publicUrl) !== '' ? $publicUrl : $defaultPublicUrl);
    }

    public function put(string $sourcePath, string $key, string $mime): string
    {
        self::assertSafeKey($key);
        $status = $this->request('PUT', $key, $sourcePath, $mime);
        if ($status !== 200) {
            throw new StorageException("S3 rechazó la subida (HTTP $status)");
        }
        return $this->urlFor($key);
    }

    public function delete(string $url): void
    {
        $key = $this->keyFromUrl($url);
        if ($key === null) {
            return;
        }
        $status = $this->request('DELETE', $key);
        if ($status !== 204 && $status !== 200 && $status !== 404) {
            throw new StorageException("S3 rechazó el borrado (HTTP $status)");
        }
    }

    public function exists(string $url): bool
    {
        $key = $this->keyFromUrl($url);
        return $key !== null && $this->request('HEAD', $key) === 200;
    }

    /**
     * Ejecuta una petición firmada con AWS Signature V4 y devuelve el código HTTP.
     * https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
     */
    private function request(string $method, string $key, ?string $file = null, ?string $mime = null): int
    {
        $path = ($this->pathStyle ? '/' . rawurlencode($this->bucket) : '') . '/' . self::encodeKey($key);
        $url = $this->endpoint . $path;

        $host = (string)parse_url($this->endpoint, PHP_URL_HOST);
        $port = parse_url($this->endpoint, PHP_URL_PORT);
        if ($port !== null && $port !== false) {
            $host .= ':' . $port;
        }

        $payloadHash = $file !== null ? (string)hash_file('sha256', $file) : self::EMPTY_PAYLOAD_HASH;
        $amzDate = gmdate('Ymd\THis\Z');
        $date = substr($amzDate, 0, 8);

        # 1. Cabeceras que se firman (en minúsculas y ordenadas)
        $headers = [
            'host' => $host,
            'x-amz-content-sha256' => $payloadHash,
            'x-amz-date' => $amzDate,
        ];
        if ($mime !== null) {
            $headers['content-type'] = $mime;
        }
        ksort($headers);

        $canonicalHeaders = '';
        foreach ($headers as $name => $value) {
            $canonicalHeaders .= $name . ':' . trim($value) . "\n";
        }
        $signedHeaders = implode(';', array_keys($headers));

        # 2. Petición canónica -> 3. texto a firmar -> 4. firma
        $canonicalRequest = implode("\n", [$method, $path, '', $canonicalHeaders, $signedHeaders, $payloadHash]);
        $scope = "$date/{$this->region}/s3/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n$amzDate\n$scope\n" . hash('sha256', $canonicalRequest);

        $signingKey = hash_hmac('sha256', $date, 'AWS4' . $this->secretKey, true);
        $signingKey = hash_hmac('sha256', $this->region, $signingKey, true);
        $signingKey = hash_hmac('sha256', 's3', $signingKey, true);
        $signingKey = hash_hmac('sha256', 'aws4_request', $signingKey, true);
        $signature = hash_hmac('sha256', $stringToSign, $signingKey);

        $headers['authorization'] = "AWS4-HMAC-SHA256 Credential={$this->accessKey}/$scope, SignedHeaders=$signedHeaders, Signature=$signature";

        $curlHeaders = ['Expect:'];
        foreach ($headers as $name => $value) {
            $curlHeaders[] = "$name: $value";
        }

        $curl = curl_init($url);
        $handle = null;
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $curlHeaders,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);
        if ($method === 'HEAD') {
            curl_setopt($curl, CURLOPT_NOBODY, true);
        }
        if ($file !== null) {
            $handle = fopen($file, 'rb');
            if ($handle === false) {
                throw new StorageException('No se pudo leer el archivo a subir');
            }
            curl_setopt_array($curl, [
                CURLOPT_UPLOAD => true,
                CURLOPT_INFILE => $handle,
                CURLOPT_INFILESIZE => (int)filesize($file),
            ]);
        }

        $result = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (is_resource($handle)) {
            fclose($handle);
        }

        if ($result === false) {
            throw new StorageException('No se pudo conectar con S3: ' . $error);
        }
        return $status;
    }
}
