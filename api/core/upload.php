<?php

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/response.php';

/**
 * Lectura y validación de archivos que llegan en peticiones multipart/form-data.
 * Solo valida: guardar el archivo es trabajo de Storage::guardar().
 *
 * Cada archivo pasa estos controles, en orden:
 *   1. Código de error de PHP ($_FILES[campo]['error'])
 *   2. is_uploaded_file(): el archivo temporal viene de esta petición HTTP
 *   3. Tamaño real del archivo <= UPLOAD_MAX_MB
 *   4. Extensión del nombre original dentro de la lista blanca del campo
 *   5. Tipo MIME detectado por contenido (finfo), no el que manda el navegador
 *   6. Firma binaria ("magic bytes") de los primeros bytes del archivo
 *
 * Cualquier fallo corta la petición con Response::error(...) y un mensaje claro.
 */
class Upload
{
    /** Formatos permitidos: extensión => tipos MIME aceptados */
    public const PDF = ['pdf' => ['application/pdf']];
    public const IMAGEN = [
        'jpg'  => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png'  => ['image/png'],
    ];

    /** Primeros bytes obligatorios de cada tipo MIME. Un formato sin firma aquí se rechaza. */
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
     * Si el cuerpo supera post_max_size, PHP descarta $_POST y $_FILES sin avisar;
     * aquí se detecta comparando CONTENT_LENGTH para devolver un error entendible.
     */
    public static function readMultipartInput(): array
    {
        $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
        $limit = self::iniBytes((string)ini_get('post_max_size'));
        if ($limit > 0 && $length > $limit) {
            Response::error('La solicitud supera el tamaño máximo permitido por el servidor.', -1, 413);
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
     * @param array $formatos extensión => tipos MIME (ej. Upload::PDF + Upload::IMAGEN)
     * @return array|null ['tmp', 'ext', 'mime', 'size', 'nombre'] listo para Storage::guardar(),
     *                    o null si el campo es opcional y no se envió archivo.
     */
    public static function validate(string $campo, string $etiqueta, array $formatos, bool $requerido): ?array
    {
        $maxBytes = self::maxBytes();
        $file = $_FILES[$campo] ?? null;

        # No se envió archivo
        if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            if ($requerido) {
                Response::error("El archivo de $etiqueta es obligatorio.", -1, 400);
            }
            return null;
        }

        # name="cv[]" o varios archivos en el mismo campo
        if (is_array($file['error'])) {
            Response::error("Solo se permite un archivo para $etiqueta.", -1, 400);
        }

        # 1. Error de PHP al recibir el archivo
        $errorPhp = (int)$file['error'];
        if ($errorPhp === UPLOAD_ERR_INI_SIZE || $errorPhp === UPLOAD_ERR_FORM_SIZE) {
            Response::error("El archivo de $etiqueta no debe superar " . self::formatMb($maxBytes) . '.', -1, 413);
        }
        if ($errorPhp === UPLOAD_ERR_PARTIAL) {
            Response::error("El archivo de $etiqueta se subió incompleto. Inténtelo de nuevo.", -1, 400);
        }
        if ($errorPhp !== UPLOAD_ERR_OK) {
            Response::error("No se pudo recibir el archivo de $etiqueta.", -1, 500);
        }

        # 2. El archivo temporal viene de esta petición
        $tmp = (string)$file['tmp_name'];
        if (!is_uploaded_file($tmp)) {
            Response::error("No se pudo recibir el archivo de $etiqueta.", -1, 400);
        }

        # 3. Tamaño real
        $size = (int)filesize($tmp);
        if ($size <= 0) {
            Response::error("El archivo de $etiqueta está vacío.", -1, 400);
        }
        if ($size > $maxBytes) {
            Response::error("El archivo de $etiqueta no debe superar " . self::formatMb($maxBytes) . '.', -1, 413);
        }

        # 4. Extensión
        $nombre = (string)$file['name'];
        $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
        $permitidas = implode(', ', array_keys($formatos));
        if (!isset($formatos[$ext])) {
            Response::error("Formato no permitido para $etiqueta. Formatos aceptados: $permitidas.", -1, 415);
        }

        # 5 y 6. Contenido real: MIME por contenido + firma binaria
        $mime = (string)(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
        if (!in_array($mime, $formatos[$ext], true) || !self::firmaValida($tmp, $mime)) {
            Response::error("El contenido del archivo de $etiqueta no es un $permitidas válido.", -1, 415);
        }

        return [
            'tmp'    => $tmp,
            'ext'    => $ext === 'jpeg' ? 'jpg' : $ext,
            'mime'   => $mime,
            'size'   => $size,
            'nombre' => $nombre,
        ];
    }

    /** true si los primeros bytes del archivo coinciden con la firma de su MIME. */
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

    /** 5242880 -> "5 MB" */
    private static function formatMb(int $bytes): string
    {
        return rtrim(rtrim(number_format($bytes / 1048576, 1, '.', ''), '0'), '.') . ' MB';
    }

    /** Valor de php.ini a bytes: "40M" -> 41943040 */
    private static function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        $number = (int)$value;
        $unidad = strtolower(substr($value, -1));
        if ($unidad === 'g') return $number * 1073741824;
        if ($unidad === 'm') return $number * 1048576;
        if ($unidad === 'k') return $number * 1024;
        return $number;
    }
}
