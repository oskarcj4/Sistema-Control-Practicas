<?php

require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/permisos.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json");

$connection = Connection::load();
$method     = $_SERVER["REQUEST_METHOD"];

# Resumen del panel de inicio del administrador. Solo lectura, solo admin.
requireAuth([ROL_ADMIN]);

if ($method !== 'GET') {
    Response::invalidMethod();
}

try {
    $uno = static function (string $sql) use ($connection): int {
        return (int)$connection->query($sql)->fetchColumn();
    };

    # Postulaciones de los últimos 7 días agrupadas por día (para la mini gráfica)
    $porDia = $connection->query(
        "SELECT DATE(fecha_postulacion) AS dia, COUNT(*) AS total
           FROM postulaciones
          WHERE estado = 1 AND fecha_postulacion >= CURDATE() - INTERVAL 6 DAY
          GROUP BY DATE(fecha_postulacion)
          ORDER BY dia"
    )->fetchAll(PDO::FETCH_ASSOC);

    $porEstado = $connection->query(
        "SELECT estado_postulacion AS estado, COUNT(*) AS total
           FROM postulaciones WHERE estado = 1
          GROUP BY estado_postulacion"
    )->fetchAll(PDO::FETCH_KEY_PAIR);

    Response::success([
        'solicitudes_pendientes'   => $uno("SELECT COUNT(*) FROM solicitudes_publicacion WHERE estado = 1 AND estado_solicitud = 'pendiente'"),
        'ofertas_activas'          => $uno("SELECT COUNT(*) FROM oportunidades WHERE estado = 1 AND estado_oportunidad = 'activa' AND fecha_cierre >= CURDATE()"),
        'ofertas_por_vencer'       => $uno("SELECT COUNT(*) FROM oportunidades WHERE estado = 1 AND estado_oportunidad = 'activa' AND fecha_cierre BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY"),
        'postulaciones_semana'     => $uno("SELECT COUNT(*) FROM postulaciones WHERE estado = 1 AND fecha_postulacion >= CURDATE() - INTERVAL 6 DAY"),
        'postulaciones_pendientes' => $uno("SELECT COUNT(*) FROM postulaciones WHERE estado = 1 AND estado_postulacion = 'pendiente'"),
        'usuarios_nuevos_semana'   => $uno("SELECT COUNT(*) FROM usuarios WHERE estado = 1 AND fecha_registro >= CURDATE() - INTERVAL 6 DAY"),
        'usuarios_activos'         => $uno("SELECT COUNT(*) FROM usuarios WHERE estado = 1 AND estado_cuenta = 'activo'"),
        'usuarios_suspendidos'     => $uno("SELECT COUNT(*) FROM usuarios WHERE estado = 1 AND estado_cuenta = 'suspendido'"),
        'postulaciones_por_dia'    => $porDia,
        'postulaciones_por_estado' => $porEstado,
    ]);
} catch (\Throwable $th) {
    Response::error("Error", -1, 500);
    //Response::debugError($th);
}
