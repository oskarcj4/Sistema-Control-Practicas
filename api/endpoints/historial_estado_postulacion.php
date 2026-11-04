<?php

require_once __DIR__ . "/../models/historial_estado_postulacion.php";
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
    $historial = new HistorialEstadoPostulacion($connection, $response);

    switch ($method) {
        case 'GET':
            $id             = (int)($_GET['id'] ?? 0);
            $postulacion_id = (int)($_GET['postulacion_id'] ?? 0);

            if ($id > 0) {
                $historial->findById($id);
            } elseif ($postulacion_id > 0) {
                $historial->findByPostulacion($postulacion_id);
            } else {
                $historial->findAll();
            }
            break;

        case 'POST':
            $historial->add([
                'postulacion_id'  => inputString($data, 'postulacion_id'),
                'estado_anterior' => inputString($data, 'estado_anterior'),
                'estado_nuevo'    => inputString($data, 'estado_nuevo'),
                'comentario'      => inputString($data, 'comentario'),
                'actualizado_por' => inputString($data, 'actualizado_por')
            ]);
            break;

        case 'PUT':
            $historial->update([
                'id'         => inputString($data, 'id'),
                'comentario' => inputString($data, 'comentario')
            ]);
            break;

        case 'DELETE':
            $historial->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
