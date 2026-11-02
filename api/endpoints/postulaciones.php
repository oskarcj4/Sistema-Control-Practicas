<?php

require_once __DIR__ . "/../models/postulaciones.php";
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
        $id             = trim($_GET['id'] ?? '');
        $estudiante_id  = trim($_GET['estudiante_id'] ?? '');
        $oportunidad_id = trim($_GET['oportunidad_id'] ?? '');

        try {
            $postulacion = new Postulaciones($connection, $response);
            if (!empty($id)) {
                $postulacion->findById((int)$id);
            } elseif (!empty($estudiante_id)) {
                $postulacion->findByEstudiante((int)$estudiante_id);
            } elseif (!empty($oportunidad_id)) {
                $postulacion->findByOportunidad((int)$oportunidad_id);
            } else {
                $postulacion->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $postulacionData = [
            'oportunidad_id'          => trim($_POST['oportunidad_id'] ?? ''),
            'estudiante_id'           => trim($_POST['estudiante_id'] ?? ''),
            'cv_url'                  => trim($_POST['cv_url'] ?? ''),
            'constancia_estudios_url' => trim($_POST['constancia_estudios_url'] ?? ''),
            'mensaje_presentacion'    => trim($_POST['mensaje_presentacion'] ?? '')
        ];

        try {
            $postulacion = new Postulaciones($connection, $response);
            $postulacion->add($postulacionData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        # accion=estado -> el reclutador cambia el estado (queda en historial); sin accion -> el estudiante edita
        $accion = trim($_PUT['accion'] ?? '');

        try {
            $postulacion = new Postulaciones($connection, $response);
            if ($accion === 'estado') {
                $postulacion->changeState([
                    'id'              => trim($_PUT['id'] ?? ''),
                    'estado_postulacion' => trim($_PUT['estado_postulacion'] ?? ''),
                    'comentario'      => trim($_PUT['comentario'] ?? ''),
                    'actualizado_por' => trim($_PUT['actualizado_por'] ?? '')
                ]);
            } else {
                $postulacion->update([
                    'id'                      => trim($_PUT['id'] ?? ''),
                    'cv_url'                  => trim($_PUT['cv_url'] ?? ''),
                    'constancia_estudios_url' => trim($_PUT['constancia_estudios_url'] ?? ''),
                    'mensaje_presentacion'    => trim($_PUT['mensaje_presentacion'] ?? '')
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
            $postulacion = new Postulaciones($connection, $response);
            $postulacion->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
