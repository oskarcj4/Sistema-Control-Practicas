<?php

require_once __DIR__ . "/../models/solicitudes_publicacion.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/request.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/permisos.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# Toda la API de solicitudes exige sesión; escritura valida CSRF dentro de requireAuth.
$auth   = requireAuth();
$propio = (int)$auth['id'];

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    $solicitud = new SolicitudesPublicacion($connection, $response);

    switch ($method) {
        case 'GET':
            $id               = (int)($_GET['id'] ?? 0);
            $usuario_id       = (int)($_GET['usuario_id'] ?? 0);
            $estado_solicitud = trim($_GET['estado_solicitud'] ?? '');

            if ($id > 0) {
                # Admin o dueño de la solicitud
                exigirPermiso(esAdmin($auth) || duenoSolicitud($connection, $id) === $propio);
                $solicitud->findById($id);
            } elseif ($usuario_id > 0) {
                exigirPermiso(esAdmin($auth) || $usuario_id === $propio);
                $solicitud->findByUsuario($usuario_id);
            } elseif ($estado_solicitud !== '') {
                exigirAdmin($auth);
                $solicitud->findByEstado($estado_solicitud);
            } else {
                exigirAdmin($auth);
                $solicitud->findAll();
            }
            break;

        case 'POST':
            $solicitud->add([
                'usuario_id'                   => (string)$propio, # sale de la cookie, no del cuerpo
                'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                'documento_respaldo_url'       => inputString($data, 'documento_respaldo_url')
            ]);
            break;

        case 'PUT':
            # accion=revisar -> el admin aprueba/rechaza; sin accion -> el solicitante edita su solicitud
            if (inputString($data, 'accion') === 'revisar') {
                exigirAdmin($auth);
                $solicitud->review([
                    'id'               => inputString($data, 'id'),
                    'estado_solicitud' => inputString($data, 'estado_solicitud'),
                    'comentario_admin' => inputString($data, 'comentario_admin'),
                    'revisado_por'     => (string)$propio # sale de la cookie
                ]);
            } else {
                # Solo el dueño edita su solicitud (el modelo exige que siga pendiente)
                exigirPermiso(duenoSolicitud($connection, (int)inputString($data, 'id', '0')) === $propio);
                $solicitud->update([
                    'id'                           => inputString($data, 'id'),
                    'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                    'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                    'documento_respaldo_url'       => inputString($data, 'documento_respaldo_url')
                ]);
            }
            break;

        case 'DELETE':
            # Admin borra cualquiera; el dueño solo cancela mientras está pendiente
            $id = (int)($_GET['id'] ?? 0);
            if (!esAdmin($auth)) {
                exigirPermiso(duenoSolicitud($connection, $id) === $propio);
                $pendiente = filaUnica($connection, "SELECT id FROM solicitudes_publicacion WHERE id = ? AND estado = 1 AND estado_solicitud = 'pendiente'", [$id]);
                if ($pendiente === null) {
                    Response::error("La solicitud ya fue revisada y no se puede cancelar", -1, 409);
                }
            }
            $solicitud->delete($id);
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
