<?php

require_once __DIR__ . "/../models/asignaciones_roles.php";
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
    $asignacion = new AsignacionesRoles($connection, $response);

    switch ($method) {
        case 'GET':
            $id_usuario = (int)($_GET['id_usuario'] ?? 0);
            if ($id_usuario > 0) {
                $asignacion->findByUsuario($id_usuario);
            } else {
                $asignacion->findAll();
            }
            break;

        case 'POST':
            $asignacion->add([
                'id_usuario' => inputString($data, 'id_usuario'),
                'id_rol'     => inputString($data, 'id_rol')
            ]);
            break;

        case 'DELETE':
            $id_usuario = (int)($_GET['id_usuario'] ?? 0);
            $id_rol     = (int)($_GET['id_rol'] ?? 0);
            $asignacion->delete($id_usuario, $id_rol);
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
