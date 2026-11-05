<?php

require_once __DIR__ . '/env.php';

/** Error al guardar o consultar un archivo (disco, S3 caído o .env mal configurado). */
class StorageException extends RuntimeException
{
}

/**
 * Guarda los archivos subidos y genera el link que va a la base de datos.
 *
 * El destino lo decide STORAGE_DRIVER en el .env (ver docs/SUBIDA_ARCHIVOS.md):
 *   local -> carpeta del servidor (STORAGE_LOCAL_PATH, por defecto <proyecto>/uploads)
 *   s3    -> bucket de Amazon S3 o compatible (variables STORAGE_S3_*)
 *
 * Cada archivo tiene una "llave" (su ruta relativa), por ejemplo:
 *   postulaciones/cv/2026/11/3f9a0c...e1.pdf
 * Su link es STORAGE_PUBLIC_URL + "/" + llave. Ese link es lo que se guarda en la BD.
 * La llave es igual en local y en S3, así que migrar es copiar la carpeta al bucket.
 *
 * Uso (primero se sube, después se guarda el link en la BD):
 *   $url = Storage::guardar($archivo, 'postulaciones/cv');  // $archivo sale de Upload::validate()
 *   Storage::esUrlPermitida($url);                         // antes de guardar el link en la BD
 */
class Storage
{
    /** Si STORAGE_PUBLIC_URL está vacío en modo local, se usa esta URL (XAMPP). */
    private const URL_LOCAL_POR_DEFECTO = 'http://localhost/SistemaControlPracticas/uploads';

    /**
     * Formato de las llaves: letras, números, "_" y "-" separados por "/", con una extensión.
     * Así nunca se acepta "..", "\" ni rutas absolutas que salgan de la carpeta.
     */
    private const PATRON_LLAVE = '#^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*\.[A-Za-z0-9]+$#';

    /**
     * Guarda el archivo y devuelve su link público.
     * El nombre original nunca se usa: la llave es <carpeta>/<año>/<mes>/<32 caracteres aleatorios>.<ext>
     *
     * @param array $archivo resultado de Upload::validate() (usa 'tmp', 'ext' y 'mime')
     * @throws StorageException
     */
    public static function guardar(array $archivo, string $carpeta): string
    {
        $llave = trim($carpeta, '/') . '/' . date('Y/m') . '/' . bin2hex(random_bytes(16)) . '.' . $archivo['ext'];

        if (self::driver() === 's3') {
            $status = self::peticionS3('PUT', $llave, $archivo['tmp'], $archivo['mime']);
            if ($status !== 200) {
                throw new StorageException("S3 rechazó la subida (HTTP $status)");
            }
        } else {
            $destino = self::carpetaLocal() . '/' . $llave;
            $carpetaDestino = dirname($destino);

            # "@" evita que el warning de PHP se mezcle con el JSON; el error se informa con la excepción
            if (!is_dir($carpetaDestino) && !@mkdir($carpetaDestino, 0755, true)) {
                throw new StorageException('No se pudo crear la carpeta destino');
            }
            if (!@move_uploaded_file($archivo['tmp'], $destino)) {
                throw new StorageException('No se pudo guardar el archivo');
            }
        }

        return self::urlPublica() . '/' . $llave;
    }

    /**
     * true si el link es de nuestro almacenamiento y el archivo existe de verdad
     * (archivo en disco o objeto en el bucket).
     */
    public static function existe(string $url): bool
    {
        $llave = self::llaveDeUrl($url, self::urlPublica());
        if ($llave === null) {
            return false;
        }

        if (self::driver() === 's3') {
            return self::peticionS3('HEAD', $llave) === 200;
        }
        return is_file(self::carpetaLocal() . '/' . $llave);
    }

    /**
     * ¿Se puede guardar este link en la BD?
     *
     * Acepta solo:
     *  1. Links del almacenamiento actual (STORAGE_PUBLIC_URL) cuyo archivo exista.
     *  2. Links de almacenamientos anteriores listados en STORAGE_ALLOWED_URLS
     *     (ej. la carpeta local después de pasar a S3). De estos solo se revisa
     *     el prefijo y el formato, porque no se puede consultar el almacenamiento viejo.
     *
     * Cualquier otro link (Google Drive, sitios externos, "javascript:"...) se rechaza.
     */
    public static function esUrlPermitida(string $url): bool
    {
        if ($url === '' || mb_strlen($url) > 255) {
            return false;
        }

        if (self::llaveDeUrl($url, self::urlPublica()) !== null) {
            return self::existe($url);
        }

        foreach (explode(',', self::env('STORAGE_ALLOWED_URLS')) as $prefijoAnterior) {
            $prefijoAnterior = trim($prefijoAnterior);
            if ($prefijoAnterior !== '' && self::llaveDeUrl($url, $prefijoAnterior) !== null) {
                return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------------------------
    // Configuración (.env)
    // ---------------------------------------------------------------------

    /** 'local' o 's3' */
    private static function driver(): string
    {
        $driver = strtolower(self::env('STORAGE_DRIVER', 'local'));
        if ($driver !== 'local' && $driver !== 's3') {
            throw new StorageException("STORAGE_DRIVER desconocido: $driver (use local o s3)");
        }
        return $driver;
    }

    /** URL base de los links, sin "/" al final. */
    private static function urlPublica(): string
    {
        $url = self::env('STORAGE_PUBLIC_URL');

        if ($url === '') {
            $url = self::driver() === 's3' ? self::datosS3()['base'] : self::URL_LOCAL_POR_DEFECTO;
        }
        if (!preg_match('#^https?://#i', $url)) {
            throw new StorageException('STORAGE_PUBLIC_URL debe ser una URL http(s) válida');
        }
        return rtrim($url, '/');
    }

    /** Carpeta física de los archivos en modo local, sin "/" al final. */
    private static function carpetaLocal(): string
    {
        $carpeta = self::env('STORAGE_LOCAL_PATH', dirname(__DIR__, 2) . '/uploads');
        return rtrim(str_replace('\\', '/', $carpeta), '/');
    }

    /**
     * Si $url = "$prefijo/<llave válida>" devuelve la llave; si no, null.
     */
    private static function llaveDeUrl(string $url, string $prefijo): ?string
    {
        $prefijo = rtrim($prefijo, '/') . '/';
        if (!str_starts_with($url, $prefijo)) {
            return null;
        }
        $llave = substr($url, strlen($prefijo));
        return preg_match(self::PATRON_LLAVE, $llave) === 1 ? $llave : null;
    }

    /** Lee una variable del .env; vacío cuenta como "no definida". */
    private static function env(string $nombre, string $porDefecto = ''): string
    {
        $valor = trim((string)Env::get($nombre, ''));
        return $valor !== '' ? $valor : $porDefecto;
    }

    // ---------------------------------------------------------------------
    // Amazon S3 (sin SDK: firma AWS Signature V4 con curl)
    // ---------------------------------------------------------------------

    /**
     * Datos de conexión a S3.
     *   base -> URL del bucket
     *   ruta -> lo que va antes de la llave en la petición ('' en AWS, '/bucket' en servicios compatibles)
     */
    private static function datosS3(): array
    {
        $s3 = [
            'bucket'   => self::env('STORAGE_S3_BUCKET'),
            'region'   => self::env('STORAGE_S3_REGION', 'us-east-1'),
            'key'      => self::env('STORAGE_S3_KEY'),
            'secret'   => self::env('STORAGE_S3_SECRET'),
            'endpoint' => rtrim(self::env('STORAGE_S3_ENDPOINT'), '/'),
        ];

        foreach (['bucket' => 'STORAGE_S3_BUCKET', 'key' => 'STORAGE_S3_KEY', 'secret' => 'STORAGE_S3_SECRET'] as $campo => $variable) {
            if ($s3[$campo] === '') {
                throw new StorageException("$variable no está configurado");
            }
        }

        if ($s3['endpoint'] === '') {
            # AWS: https://bucket.s3.region.amazonaws.com/llave
            $s3['servidor'] = "https://{$s3['bucket']}.s3.{$s3['region']}.amazonaws.com";
            $s3['ruta']     = '';
        } else {
            # MinIO, R2, Spaces...: https://endpoint/bucket/llave
            $s3['servidor'] = $s3['endpoint'];
            $s3['ruta']     = '/' . $s3['bucket'];
        }
        $s3['base'] = $s3['servidor'] . $s3['ruta'];

        return $s3;
    }

    /**
     * Hace una petición firmada a S3 (PUT para subir, HEAD para consultar) y devuelve el código HTTP.
     * Especificación de la firma:
     * https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
     */
    private static function peticionS3(string $metodo, string $llave, ?string $archivo = null, ?string $mime = null): int
    {
        $s3   = self::datosS3();
        $ruta = $s3['ruta'] . '/' . $llave;

        $host   = (string)parse_url($s3['servidor'], PHP_URL_HOST);
        $puerto = parse_url($s3['servidor'], PHP_URL_PORT);
        if ($puerto) {
            $host .= ':' . $puerto;
        }

        # Hash del contenido (el de un cuerpo vacío si no hay archivo)
        $hashContenido = hash('sha256', '');
        if ($archivo !== null) {
            $hashContenido = hash_file('sha256', $archivo);
        }

        $fechaHora = gmdate('Ymd\THis\Z');
        $fecha     = gmdate('Ymd');

        # 1. Cabeceras que se firman (minúsculas, en orden alfabético)
        $cabeceras = [
            'host'                 => $host,
            'x-amz-content-sha256' => $hashContenido,
            'x-amz-date'           => $fechaHora,
        ];
        if ($mime !== null) {
            $cabeceras['content-type'] = $mime;
        }
        ksort($cabeceras);

        $textoCabeceras = '';
        foreach ($cabeceras as $nombre => $valor) {
            $textoCabeceras .= "$nombre:$valor\n";
        }
        $nombresFirmados = implode(';', array_keys($cabeceras));

        # 2. Petición canónica y texto a firmar
        $peticionCanonica = implode("\n", [$metodo, $ruta, '', $textoCabeceras, $nombresFirmados, $hashContenido]);
        $alcance = "$fecha/{$s3['region']}/s3/aws4_request";
        $textoAFirmar = "AWS4-HMAC-SHA256\n$fechaHora\n$alcance\n" . hash('sha256', $peticionCanonica);

        # 3. Firma
        $llaveFirma = hash_hmac('sha256', $fecha, 'AWS4' . $s3['secret'], true);
        $llaveFirma = hash_hmac('sha256', $s3['region'], $llaveFirma, true);
        $llaveFirma = hash_hmac('sha256', 's3', $llaveFirma, true);
        $llaveFirma = hash_hmac('sha256', 'aws4_request', $llaveFirma, true);
        $firma = hash_hmac('sha256', $textoAFirmar, $llaveFirma);

        $cabeceras['authorization'] = "AWS4-HMAC-SHA256 Credential={$s3['key']}/$alcance, SignedHeaders=$nombresFirmados, Signature=$firma";

        # 4. Enviar con curl
        $cabecerasCurl = ['Expect:'];
        foreach ($cabeceras as $nombre => $valor) {
            $cabecerasCurl[] = "$nombre: $valor";
        }

        $curl = curl_init($s3['servidor'] . $ruta);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $metodo);
        curl_setopt($curl, CURLOPT_HTTPHEADER, $cabecerasCurl);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_TIMEOUT, 60);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);

        if ($metodo === 'HEAD') {
            curl_setopt($curl, CURLOPT_NOBODY, true);
        }

        $lector = null;
        if ($archivo !== null) {
            $lector = fopen($archivo, 'rb');
            if ($lector === false) {
                throw new StorageException('No se pudo leer el archivo a subir');
            }
            curl_setopt($curl, CURLOPT_UPLOAD, true);
            curl_setopt($curl, CURLOPT_INFILE, $lector);
            curl_setopt($curl, CURLOPT_INFILESIZE, (int)filesize($archivo));
        }

        $resultado = curl_exec($curl);
        $status    = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error     = curl_error($curl);
        curl_close($curl);
        if ($lector) {
            fclose($lector);
        }

        if ($resultado === false) {
            throw new StorageException('No se pudo conectar con S3: ' . $error);
        }
        return $status;
    }
}
