<?php

declare(strict_types=1);

/** Error al guardar, consultar o borrar un archivo en el almacenamiento (disco, S3...). */
final class StorageException extends RuntimeException
{
}

/**
 * Contrato que cumple cualquier lugar donde se guarden archivos.
 *
 * El resto del sistema solo conoce esta interfaz: no sabe si el archivo
 * termina en una carpeta del computador o en un bucket de S3. Para cambiar
 * de destino basta con cambiar STORAGE_DRIVER y STORAGE_PUBLIC_URL en el .env
 * (ver docs/SUBIDA_ARCHIVOS.md).
 */
interface FileStorage
{
    /**
     * Guarda el archivo $sourcePath bajo la llave $key
     * (ej. "postulaciones/cv/2026/11/3f9a...e1.pdf") y devuelve la URL pública
     * con la que se podrá descargar. Esa URL es la que se guarda en la base de datos.
     *
     * @throws StorageException
     */
    public function put(string $sourcePath, string $key, string $mime): string;

    /**
     * Borra un archivo a partir de la URL que devolvió put().
     * Si la URL no pertenece a este almacenamiento no hace nada.
     *
     * @throws StorageException
     */
    public function delete(string $url): void;

    /** true si la URL empieza con STORAGE_PUBLIC_URL y su llave es válida. */
    public function owns(string $url): bool;

    /**
     * true si el archivo detrás de la URL existe realmente
     * (archivo en disco o objeto en el bucket).
     *
     * @throws StorageException
     */
    public function exists(string $url): bool;
}

/**
 * Lógica común a todos los almacenamientos: convertir llave <-> URL pública
 * usando STORAGE_PUBLIC_URL y validar que las llaves sean seguras.
 */
abstract class BaseStorage implements FileStorage
{
    /**
     * Formato permitido para las llaves: segmentos alfanuméricos, guion o guion bajo
     * separados por "/", y una extensión al final. Así nunca se aceptan "..",
     * rutas absolutas, "\" ni caracteres que puedan escapar de la carpeta raíz.
     */
    private const KEY_PATTERN = '#^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*\.[A-Za-z0-9]+$#';

    protected string $publicUrl;

    public function __construct(string $publicUrl)
    {
        $publicUrl = rtrim(trim($publicUrl), '/');
        if ($publicUrl === '' || !preg_match('#^https?://#i', $publicUrl)) {
            throw new StorageException('STORAGE_PUBLIC_URL debe ser una URL http(s) válida');
        }
        $this->publicUrl = $publicUrl;
    }

    public function owns(string $url): bool
    {
        return $this->keyFromUrl($url) !== null;
    }

    /** Llave -> URL pública. */
    protected function urlFor(string $key): string
    {
        return $this->publicUrl . '/' . self::encodeKey($key);
    }

    /** URL pública -> llave, o null si la URL no es de este almacenamiento. */
    protected function keyFromUrl(string $url): ?string
    {
        return self::keyAfterPrefix($url, $this->publicUrl);
    }

    /**
     * Si $url = "$prefix/<llave válida>" devuelve la llave; si no, null.
     * Se usa también para validar URLs de almacenamientos anteriores (STORAGE_ALLOWED_URLS).
     */
    public static function keyAfterPrefix(string $url, string $prefix): ?string
    {
        $prefix = rtrim($prefix, '/') . '/';
        if ($prefix === '/' || !str_starts_with($url, $prefix)) {
            return null;
        }
        $key = rawurldecode(substr($url, strlen($prefix)));
        return self::isSafeKey($key) ? $key : null;
    }

    public static function isSafeKey(string $key): bool
    {
        return $key !== '' && preg_match(self::KEY_PATTERN, $key) === 1;
    }

    protected static function assertSafeKey(string $key): void
    {
        if (!self::isSafeKey($key)) {
            throw new StorageException('Llave de archivo inválida');
        }
    }

    protected static function encodeKey(string $key): string
    {
        return implode('/', array_map('rawurlencode', explode('/', $key)));
    }
}
