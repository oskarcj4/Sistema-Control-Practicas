<?php

require_once __DIR__ . "/../models/carreras.php";
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
        $institucion_id = trim($_GET['institucion_id'] ?? '');

        try {
            $carrera = new Carreras($connection, $response);
            if (!empty($id)) {
                $carrera->findById((int)$id);
            } elseif (!empty($institucion_id)) {
                $carrera->findByInstitucion((int)$institucion_id);
            } else {
                $carrera->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $carreraData = [
            'institucion_id' => trim($_POST['institucion_id'] ?? ''),
            'nombre'         => trim($_POST['nombre'] ?? ''),
            'codigo'         => trim($_POST['codigo'] ?? '')
        ];

        try {
            $carrera = new Carreras($connection, $response);
            $carrera->add($carreraData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $carreraData = [
            'id'             => trim($_PUT['id'] ?? ''),
            'institucion_id' => trim($_PUT['institucion_id'] ?? ''),
            'nombre'         => trim($_PUT['nombre'] ?? ''),
            'codigo'         => trim($_PUT['codigo'] ?? '')
        ];

        try {
            $carrera = new Carreras($connection, $response);
            $carrera->update($carreraData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $carrera = new Carreras($connection, $response);
            $carrera->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
