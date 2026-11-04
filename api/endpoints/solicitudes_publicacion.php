<?php

require_once __DIR__ . "/../models/solicitudes_publicacion.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/request.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

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
                $solicitud->findById($id);
            } elseif ($usuario_id > 0) {
                $solicitud->findByUsuario($usuario_id);
            } elseif ($estado_solicitud !== '') {
                $solicitud->findByEstado($estado_solicitud);
            } else {
                $solicitud->findAll();
            }
            break;

        case 'POST':
            $solicitud->add([
                'usuario_id'                   => inputString($data, 'usuario_id'),
                'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                'documento_respaldo_url'       => inputString($data, 'documento_respaldo_url')
            ]);
            break;

        case 'PUT':
            # accion=revisar -> el admin aprueba/rechaza; sin accion -> el solicitante edita su solicitud
            if (inputString($data, 'accion') === 'revisar') {
                $solicitud->review([
                    'id'               => inputString($data, 'id'),
                    'estado_solicitud' => inputString($data, 'estado_solicitud'),
                    'comentario_admin' => inputString($data, 'comentario_admin'),
                    'revisado_por'     => inputString($data, 'revisado_por')
                ]);
            } else {
                $solicitud->update([
                    'id'                           => inputString($data, 'id'),
                    'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                    'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                    'documento_respaldo_url'       => inputString($data, 'documento_respaldo_url')
                ]);
            }
            break;

        case 'DELETE':
            $solicitud->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
