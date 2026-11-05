<?php

declare(strict_types=1);

require_once __DIR__ . '/../env.php';
require_once __DIR__ . '/file-storage.php';
require_once __DIR__ . '/local-storage.php';
require_once __DIR__ . '/s3-storage.php';

/**
 * Punto único de acceso al almacenamiento de archivos.
 *
 * Lee el .env y construye el almacenamiento activo:
 *   STORAGE_DRIVER=local -> LocalStorage (carpeta del computador)
 *   STORAGE_DRIVER=s3    -> S3Storage (bucket de Amazon S3)
 *
 * Ningún endpoint ni modelo crea LocalStorage/S3Storage directamente:
 * todos llaman Storage::driver(). Por eso cambiar de destino es solo
 * cambiar el .env.
 */
final class Storage
{
    /** URL de la carpeta uploads/ en XAMPP cuando STORAGE_PUBLIC_URL no está en el .env. */
    private const LOCAL_PUBLIC_URL_POR_DEFECTO = 'http://localhost/SistemaControlPracticas/uploads';

    private static ?FileStorage $driver = null;

    public static function driver(): FileStorage
    {
        if (self::$driver !== null) {
            return self::$driver;
        }

        $driver = strtolower(trim((string)Env::get('STORAGE_DRIVER', 'local')));
        $publicUrl = self::env('STORAGE_PUBLIC_URL');

        self::$driver = match ($driver) {
            'local', '' => new LocalStorage(
                self::env('STORAGE_LOCAL_PATH', dirname(__DIR__, 3) . '/uploads'),
                $publicUrl !== '' ? $publicUrl : self::LOCAL_PUBLIC_URL_POR_DEFECTO
            ),
            's3' => new S3Storage(
                self::env('STORAGE_S3_BUCKET'),
                self::env('STORAGE_S3_REGION', 'us-east-1'),
                self::env('STORAGE_S3_KEY'),
                self::env('STORAGE_S3_SECRET'),
                $publicUrl,
                self::env('STORAGE_S3_ENDPOINT')
            ),
            default => throw new StorageException("STORAGE_DRIVER desconocido: $driver (use local o s3)"),
        };

        return self::$driver;
    }

    /**
     * ¿Se puede guardar esta URL en la base de datos?
     *
     * Acepta solo:
     *  1. URLs del almacenamiento activo (STORAGE_PUBLIC_URL) cuyo archivo exista de verdad.
     *  2. URLs de almacenamientos anteriores listados en STORAGE_ALLOWED_URLS
     *     (por ejemplo la carpeta local después de migrar a S3). De estas solo se
     *     valida el prefijo y el formato de la llave, porque el driver activo no
     *     puede consultarlas.
     *
     * Cualquier otro enlace (Google Drive, sitios externos, "javascript:"...) se rechaza.
     */
    public static function isAllowedUrl(string $url): bool
    {
        if ($url === '' || mb_strlen($url) > 255) {
            return false;
        }

        $driver = self::driver();
        if ($driver->owns($url)) {
            return $driver->exists($url);
        }

        foreach (self::legacyPrefixes() as $prefix) {
            if (BaseStorage::keyAfterPrefix($url, $prefix) !== null) {
                return true;
            }
        }
        return false;
    }

    /** @return string[] */
    private static function legacyPrefixes(): array
    {
        $raw = (string)Env::get('STORAGE_ALLOWED_URLS', '');
        return array_values(array_filter(
            array_map(static fn(string $p): string => rtrim(trim($p), '/'), explode(',', $raw)),
            static fn(string $p): bool => preg_match('#^https?://#i', $p) === 1
        ));
    }

    /** Lee una variable del .env tratando el valor vacío como "no definido". */
    private static function env(string $name, string $default = ''): string
    {
        $value = trim((string)Env::get($name, ''));
        return $value !== '' ? $value : $default;
    }
}
