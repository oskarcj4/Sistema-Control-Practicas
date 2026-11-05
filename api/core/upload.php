<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/storage/storage.php';

/**
 * Lectura y validación de archivos que llegan en peticiones multipart/form-data.
 *
 * Cada archivo pasa por estas capas antes de guardarse:
 *   1. Código de error de PHP ($_FILES[campo]['error'])
 *   2. is_uploaded_file(): el archivo temporal viene de esta petición HTTP
 *   3. Tamaño real del archivo <= UPLOAD_MAX_MB
 *   4. Extensión del nombre original dentro de la lista blanca del campo
 *   5. Tipo MIME detectado por contenido (finfo), no el que manda el navegador
 *   6. Firma binaria ("magic bytes") de los primeros bytes del archivo
 *
 * Cualquier fallo corta la petición con Response::error(...) y un mensaje claro.
 */
final class Upload
{
    /** extensión => tipos MIME aceptados */
    public const PDF = ['pdf' => ['application/pdf']];
    public const IMAGEN = [
        'jpg'  => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png'  => ['image/png'],
    ];

    /** Primeros bytes obligatorios de cada tipo MIME. */
    private const FIRMAS = [
        'application/pdf' => '%PDF-',
        'image/jpeg'      => "\xFF\xD8\xFF",
        'image/png'       => "\x89PNG\r\n\x1A\n",
    ];

    private const MAX_MB_POR_DEFECTO = 5;

    public static function isMultipart(): bool
    {
        return stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data') !== false;
    }

    /**
     * Devuelve los campos de texto del formulario ($_POST).
     *
     * Si el cuerpo supera post_max_size PHP descarta $_POST y $_FILES sin avisar;
     * aquí se detecta comparando CONTENT_LENGTH para devolver un error entendible.
     */
    public static function readMultipartInput(): array
    {
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        $limit = self::iniBytes((string)ini_get('post_max_size'));
        if ($limit > 0 && $length > $limit) {
            Response::error('La solicitud supera el tamaño máximo permitido por el servidor.', -1, httpCode: 413);
        }
        return $_POST;
    }

    /** Límite por archivo en bytes (UPLOAD_MAX_MB en el .env, 5 MB por defecto). */
    public static function maxBytes(): int
    {
        $mb = (float)Env::get('UPLOAD_MAX_MB', (string)self::MAX_MB_POR_DEFECTO);
        if ($mb <= 0) {
            $mb = self::MAX_MB_POR_DEFECTO;
        }
        return (int)round($mb * 1024 * 1024);
    }

    /**
     * Valida el archivo del campo $campo.
     *
     * @param array<string,string[]> $formatos extensión => tipos MIME (ej. Upload::PDF + Upload::IMAGEN)
     * @return array{tmp:string, ext:string, mime:string, size:int, nombre:string}|null
     *         null si el campo es opcional y no se envió archivo.
     */
    public static function validate(string $campo, string $etiqueta, array $formatos, bool $requerido, ?int $maxBytes = null): ?array
    {
        $maxBytes ??= self::maxBytes();
        $file = $_FILES[$campo] ?? null;

        if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            if ($requerido) {
                Response::error("El archivo de $etiqueta es obligatorio.");
            }
            return null;
        }

        # name="cv[]" o varios archivos en el mismo campo
        if (is_array($file['error'])) {
            Response::error("Solo se permite un archivo para $etiqueta.");
        }

        switch ((int)$file['error']) {
            case UPLOAD_ERR_OK:
                break;
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                Response::error("El archivo de $etiqueta no debe superar " . self::formatMb($maxBytes) . '.');
            case UPLOAD_ERR_PARTIAL:
                Response::error("El archivo de $etiqueta se subió incompleto. Inténtelo de nuevo.");
            default:
                Response::error("No se pudo recibir el archivo de $etiqueta.");
        }

        $tmp = (string)$file['tmp_name'];
        if (!is_uploaded_file($tmp)) {
            Response::error("No se pudo recibir el archivo de $etiqueta.");
        }

        $size = (int)filesize($tmp);
        if ($size <= 0) {
            Response::error("El archivo de $etiqueta está vacío.");
        }
        if ($size > $maxBytes) {
            Response::error("El archivo de $etiqueta no debe superar " . self::formatMb($maxBytes) . '.');
        }

        $nombre = (string)$file['name'];
        $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
        $permitidas = implode(', ', array_keys($formatos));
        if (!isset($formatos[$ext])) {
            Response::error("Formato no permitido para $etiqueta. Formatos aceptados: $permitidas.");
        }

        $mime = (string)(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
        if (!in_array($mime, $formatos[$ext], true) || !self::firmaValida($tmp, $mime)) {
            Response::error("El contenido del archivo de $etiqueta no es un $permitidas válido.");
        }

        return ['tmp' => $tmp, 'ext' => $ext === 'jpeg' ? 'jpg' : $ext, 'mime' => $mime, 'size' => $size, 'nombre' => $nombre];
    }

    private static function firmaValida(string $path, string $mime): bool
    {
        $firma = self::FIRMAS[$mime] ?? null;
        if ($firma === null) {
            return false;
        }
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }
        $inicio = (string)fread($handle, strlen($firma));
        fclose($handle);
        return $inicio === $firma;
    }

    private static function formatMb(int $bytes): string
    {
        return rtrim(rtrim(number_format($bytes / 1048576, 1, '.', ''), '0'), '.') . ' MB';
    }

    /** "40M" -> 41943040 */
    private static function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        $number = (int)$value;
        return match (strtolower(substr($value, -1))) {
            'g' => $number * 1073741824,
            'm' => $number * 1048576,
            'k' => $number * 1024,
            default => $number,
        };
    }
}

/**
 * Agrupa los archivos subidos durante una petición para dejar todo consistente
 * aunque algo falle después de subirlos.
 *
 * Flujo: subir archivo -> obtener URL -> insertar URL en la base de datos.
 * Response::success/error terminan el script con exit, así que la limpieza se
 * hace en un register_shutdown_function al final de la petición:
 *
 *   - Respuesta con code = 1 (éxito): se borran los archivos REEMPLAZADOS
 *     (el CV viejo cuando el estudiante sube uno nuevo).
 *   - Cualquier otra respuesta (validación, error de BD, excepción): se borran
 *     los archivos NUEVOS, así no quedan archivos huérfanos sin registro en la BD.
 */
final class UploadTransaction
{
    /** @var string[] */
    private array $nuevos = [];
    /** @var string[] */
    private array $reemplazados = [];

    public function __construct(private FileStorage $storage)
    {
        register_shutdown_function([$this, 'finish']);
    }

    /**
     * Sube el archivo validado y devuelve su URL.
     * Llave: <carpeta>/<año>/<mes>/<32 caracteres aleatorios>.<ext>
     * El nombre original del archivo nunca se usa en la llave.
     */
    public function store(array $file, string $carpeta): string
    {
        $key = trim($carpeta, '/') . '/' . date('Y/m') . '/' . bin2hex(random_bytes(16)) . '.' . $file['ext'];
        $url = $this->storage->put($file['tmp'], $key, $file['mime']);
        $this->nuevos[] = $url;
        return $url;
    }

    /** Marca una URL anterior para borrarla solo si la petición termina con éxito. */
    public function replaceOnSuccess(?string $url): void
    {
        if ($url !== null && $url !== '' && $this->storage->owns($url)) {
            $this->reemplazados[] = $url;
        }
    }

    public function finish(): void
    {
        $borrar = Response::$lastCode === 1 ? $this->reemplazados : $this->nuevos;
        foreach ($borrar as $url) {
            try {
                $this->storage->delete($url);
            } catch (Throwable) {
                # No se puede responder nada aquí: la respuesta ya se envió.
            }
        }
    }
}
