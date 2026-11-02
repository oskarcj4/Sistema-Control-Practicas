<?php

require_once __DIR__ . "/../models/asignaciones_roles.php";
require_once __DIR__ . "/../core/connection.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# PHP no llena $_DELETE: se lee del cuerpo (x-www-form-urlencoded)
if ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

switch ($method) {
    case 'GET':
        $id_usuario = trim($_GET['id_usuario'] ?? '');

        try {
            $asignacion = new AsignacionesRoles($connection, $response);
            if (!empty($id_usuario)) {
                $asignacion->findByUsuario((int)$id_usuario);
            } else {
                $asignacion->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $asignacionData = [
            'id_usuario' => trim($_POST['id_usuario'] ?? ''),
            'id_rol'     => trim($_POST['id_rol'] ?? '')
        ];

        try {
            $asignacion = new AsignacionesRoles($connection, $response);
            $asignacion->add($asignacionData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id_usuario = (int)($_DELETE['id_usuario'] ?? $_GET['id_usuario'] ?? 0);
        $id_rol     = (int)($_DELETE['id_rol'] ?? $_GET['id_rol'] ?? 0);

        try {
            $asignacion = new AsignacionesRoles($connection, $response);
            $asignacion->delete($id_usuario, $id_rol);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
