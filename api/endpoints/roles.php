<?php

require_once __DIR__ . "/../models/roles.php";
require_once __DIR__ . "/../core/connection.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];


if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);
} elseif ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

switch ($method) {
    case 'GET':
        $id = trim($_GET['id'] ?? '');

        try {
            $rol = new Roles($connection, $response);
            if (!empty($id)) {
                $rol->findById((int)$id);
            } else {
                $rol->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $rolData = [
            'nombre'      => trim($_POST['nombre'] ?? ''),
            'descripcion' => trim($_POST['descripcion'] ?? '')
        ];

        try {
            $rol = new Roles($connection, $response);
            $rol->add($rolData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $rolData = [
            'id'          => trim($_PUT['id'] ?? ''),
            'nombre'      => trim($_PUT['nombre'] ?? ''),
            'descripcion' => trim($_PUT['descripcion'] ?? '')
        ];

        try {
            $rol = new Roles($connection, $response);
            $rol->update($rolData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $rol = new Roles($connection, $response);
            $rol->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
