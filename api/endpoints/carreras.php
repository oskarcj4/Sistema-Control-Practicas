<?php

require_once __DIR__ . "/../models/carreras.php";
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
    $carrera = new Carreras($connection, $response);

    switch ($method) {
        case 'GET':
            $id             = (int)($_GET['id'] ?? 0);
            $institucion_id = (int)($_GET['institucion_id'] ?? 0);

            if ($id > 0) {
                $carrera->findById($id);
            } elseif ($institucion_id > 0) {
                $carrera->findByInstitucion($institucion_id);
            } else {
                $carrera->findAll();
            }
            break;

        case 'POST':
            $carrera->add([
                'institucion_id' => inputString($data, 'institucion_id'),
                'nombre'         => inputString($data, 'nombre'),
                'codigo'         => inputString($data, 'codigo')
            ]);
            break;

        case 'PUT':
            $carrera->update([
                'id'             => inputString($data, 'id'),
                'institucion_id' => inputString($data, 'institucion_id'),
                'nombre'         => inputString($data, 'nombre'),
                'codigo'         => inputString($data, 'codigo')
            ]);
            break;

        case 'DELETE':
            $carrera->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
