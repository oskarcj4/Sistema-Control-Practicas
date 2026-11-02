<?php

require_once __DIR__ . "/../models/historial_estado_postulacion.php";
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
        $postulacion_id = trim($_GET['postulacion_id'] ?? '');

        try {
            $historial = new HistorialEstadoPostulacion($connection, $response);
            if (!empty($id)) {
                $historial->findById((int)$id);
            } elseif (!empty($postulacion_id)) {
                $historial->findByPostulacion((int)$postulacion_id);
            } else {
                $historial->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $historialData = [
            'postulacion_id'  => trim($_POST['postulacion_id'] ?? ''),
            'estado_anterior' => trim($_POST['estado_anterior'] ?? ''),
            'estado_nuevo'    => trim($_POST['estado_nuevo'] ?? ''),
            'comentario'      => trim($_POST['comentario'] ?? ''),
            'actualizado_por' => trim($_POST['actualizado_por'] ?? '')
        ];

        try {
            $historial = new HistorialEstadoPostulacion($connection, $response);
            $historial->add($historialData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $historialData = [
            'id'         => trim($_PUT['id'] ?? ''),
            'comentario' => trim($_PUT['comentario'] ?? '')
        ];

        try {
            $historial = new HistorialEstadoPostulacion($connection, $response);
            $historial->update($historialData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $historial = new HistorialEstadoPostulacion($connection, $response);
            $historial->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
