<?php

require_once __DIR__ . "/../models/roles.php";
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
    $rol = new Roles($connection, $response);

    switch ($method) {
        case 'GET':
            $id = (int)($_GET['id'] ?? 0);
            if ($id > 0) {
                $rol->findById($id);
            } else {
                $rol->findAll();
            }
            break;

        case 'POST':
            $rol->add([
                'nombre'      => inputString($data, 'nombre'),
                'descripcion' => inputString($data, 'descripcion')
            ]);
            break;

        case 'PUT':
            $rol->update([
                'id'          => inputString($data, 'id'),
                'nombre'      => inputString($data, 'nombre'),
                'descripcion' => inputString($data, 'descripcion')
            ]);
            break;

        case 'DELETE':
            $rol->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
