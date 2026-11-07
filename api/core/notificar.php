<?php

declare(strict_types=1);

/**
 * Crea una notificación para un usuario.
 *
 * $enlace es una ruta del frontend que se abre al hacer clic en la notificación,
 * por ejemplo "#/oferta/15", "#/admin/solicitudes" o "#/solicitud-publicacion".
 * Rutas válidas: ver frontend/src/helpers/rutas.js.
 *
 * Usa la conexión recibida para quedar dentro de la transacción del llamador.
 */
function crearNotificacion(PDO $connection, int $usuario_id, string $titulo, string $mensaje, ?string $enlace = null): void
{
    $stmt = $connection->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace) VALUES (?, ?, ?, ?)");
    $stmt->execute([$usuario_id, $titulo, $mensaje, enlaceValido($enlace)]);
}

/** Solo rutas internas "#/..." (evita guardar "javascript:" o sitios externos). */
function enlaceValido(?string $enlace): ?string
{
    $enlace = trim((string)$enlace);
    if ($enlace === '' || mb_strlen($enlace) > 255 || !preg_match('#^\#/[A-Za-z0-9/_\-]*$#', $enlace)) {
        return null;
    }
    return $enlace;
}
