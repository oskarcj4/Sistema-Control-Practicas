<?php

require_once __DIR__ . "/../models/solicitudes_publicacion.php";
require_once __DIR__ . "/../core/connection.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# PHP no llena $_PUT / $_DELETE: se leen del cuerpo (x-www-form-urlencoded)
if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);
} elseif ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

switch ($method) {
    case 'GET':
        $id         = trim($_GET['id'] ?? '');
        $usuario_id = trim($_GET['usuario_id'] ?? '');
        $estado_solicitud = trim($_GET['estado_solicitud'] ?? '');

        try {
            $solicitud = new SolicitudesPublicacion($connection, $response);
            if (!empty($id)) {
                $solicitud->findById((int)$id);
            } elseif (!empty($usuario_id)) {
                $solicitud->findByUsuario((int)$usuario_id);
            } elseif (!empty($estado_solicitud)) {
                $solicitud->findByEstado($estado_solicitud);
            } else {
                $solicitud->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $solicitudData = [
            'usuario_id'                   => trim($_POST['usuario_id'] ?? ''),
            'nombre_organizacion_proyecto' => trim($_POST['nombre_organizacion_proyecto'] ?? ''),
            'descripcion_actividades'      => trim($_POST['descripcion_actividades'] ?? ''),
            'documento_respaldo_url'       => trim($_POST['documento_respaldo_url'] ?? '')
        ];

        try {
            $solicitud = new SolicitudesPublicacion($connection, $response);
            $solicitud->add($solicitudData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        # accion=revisar -> el admin aprueba/rechaza; sin accion -> el solicitante edita su solicitud
        $accion = trim($_PUT['accion'] ?? '');

        try {
            $solicitud = new SolicitudesPublicacion($connection, $response);
            if ($accion === 'revisar') {
                $solicitud->review([
                    'id'               => trim($_PUT['id'] ?? ''),
                    'estado_solicitud' => trim($_PUT['estado_solicitud'] ?? ''),
                    'comentario_admin' => trim($_PUT['comentario_admin'] ?? ''),
                    'revisado_por'     => trim($_PUT['revisado_por'] ?? '')
                ]);
            } else {
                $solicitud->update([
                    'id'                           => trim($_PUT['id'] ?? ''),
                    'nombre_organizacion_proyecto' => trim($_PUT['nombre_organizacion_proyecto'] ?? ''),
                    'descripcion_actividades'      => trim($_PUT['descripcion_actividades'] ?? ''),
                    'documento_respaldo_url'       => trim($_PUT['documento_respaldo_url'] ?? '')
                ]);
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $solicitud = new SolicitudesPublicacion($connection, $response);
            $solicitud->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
