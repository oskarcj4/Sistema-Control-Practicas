<?php

require_once __DIR__ . "/../models/instituciones.php";
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
        $id   = trim($_GET['id'] ?? '');
        $tipo = trim($_GET['tipo'] ?? '');
        $acotado = isset($_GET['acotado']);
        try {
            $institucion = new Instituciones($connection, $response);
            if (!empty($id)) {
                $institucion->findById((int)$id);
            } elseif (!empty($tipo)) {
                $institucion->findByTipo($tipo);
            }elseif($acotado){
                $institucion->findAllAcotado();
            }
             else {
                $institucion->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $institucionData = [
            'nombre'         => trim($_POST['nombre'] ?? ''),
            'siglas'         => trim($_POST['siglas'] ?? ''),
            'tipo'           => trim($_POST['tipo'] ?? 'empresa'),
            'contacto_email' => trim($_POST['contacto_email'] ?? ''),
            'sitio_web'      => trim($_POST['sitio_web'] ?? '')
        ];

        try {
            $institucion = new Instituciones($connection, $response);
            $institucion->add($institucionData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $institucionData = [
            'id'             => trim($_PUT['id'] ?? ''),
            'nombre'         => trim($_PUT['nombre'] ?? ''),
            'siglas'         => trim($_PUT['siglas'] ?? ''),
            'tipo'           => trim($_PUT['tipo'] ?? 'empresa'),
            'contacto_email' => trim($_PUT['contacto_email'] ?? ''),
            'sitio_web'      => trim($_PUT['sitio_web'] ?? '')
        ];

        try {
            $institucion = new Instituciones($connection, $response);
            $institucion->update($institucionData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $institucion = new Instituciones($connection, $response);
            $institucion->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
