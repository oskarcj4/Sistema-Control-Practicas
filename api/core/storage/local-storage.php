<?php

declare(strict_types=1);

require_once __DIR__ . '/file-storage.php';

/**
 * Guarda los archivos en una carpeta del computador/servidor.
 *
 *   STORAGE_LOCAL_PATH -> carpeta física
 *                         (ej. C:/xampp/htdocs/SistemaControlPracticas/uploads)
 *   STORAGE_PUBLIC_URL -> URL con la que Apache sirve esa carpeta
 *                         (ej. http://localhost/SistemaControlPracticas/uploads)
 *
 * Llave "postulaciones/cv/2026/11/abc.pdf" se guarda en
 *   STORAGE_LOCAL_PATH/postulaciones/cv/2026/11/abc.pdf
 * y su URL es
 *   STORAGE_PUBLIC_URL/postulaciones/cv/2026/11/abc.pdf
 */
final class LocalStorage extends BaseStorage
{
    private string $root;

    public function __construct(string $root, string $publicUrl)
    {
        parent::__construct($publicUrl);

        $root = rtrim(str_replace('\\', '/', trim($root)), '/');
        if ($root === '') {
            throw new StorageException('STORAGE_LOCAL_PATH no está configurado');
        }
        if (!is_dir($root) && !@mkdir($root, 0755, true) && !is_dir($root)) {
            throw new StorageException('No se pudo crear la carpeta de archivos');
        }
        $this->root = $root;
    }

    public function put(string $sourcePath, string $key, string $mime): string
    {
        self::assertSafeKey($key);

        $target = $this->root . '/' . $key;
        $dir = dirname($target);
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new StorageException('No se pudo crear la carpeta destino');
        }

        # move_uploaded_file solo acepta archivos que llegaron en esta petición HTTP
        $ok = is_uploaded_file($sourcePath)
            ? move_uploaded_file($sourcePath, $target)
            : copy($sourcePath, $target);

        if (!$ok) {
            throw new StorageException('No se pudo guardar el archivo');
        }
        @chmod($target, 0644);

        return $this->urlFor($key);
    }

    public function delete(string $url): void
    {
        $path = $this->pathFromUrl($url);
        if ($path !== null && is_file($path) && !@unlink($path)) {
            throw new StorageException('No se pudo borrar el archivo');
        }
    }

    public function exists(string $url): bool
    {
        $path = $this->pathFromUrl($url);
        return $path !== null && is_file($path);
    }

    /** Ruta física del archivo, solo si sigue dentro de la carpeta raíz. */
    private function pathFromUrl(string $url): ?string
    {
        $key = $this->keyFromUrl($url);
        if ($key === null) {
            return null;
        }

        $path = realpath($this->root . '/' . $key);
        $root = realpath($this->root);
        if ($path === false || $root === false || !str_starts_with($path, $root . DIRECTORY_SEPARATOR)) {
            return null;
        }
        return $path;
    }
}
