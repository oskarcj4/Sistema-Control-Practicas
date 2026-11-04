<?php

require_once __DIR__ . "/../models/instituciones.php";
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
    $institucion = new Instituciones($connection, $response);

    switch ($method) {
        case 'GET':
            $id      = (int)($_GET['id'] ?? 0);
            $tipo    = trim($_GET['tipo'] ?? '');
            $acotado = isset($_GET['acotado']);

            if ($id > 0) {
                $institucion->findById($id);
            } elseif ($tipo !== '') {
                $institucion->findByTipo($tipo);
            } elseif ($acotado) {
                $institucion->findAllAcotado();
            } else {
                $institucion->findAll();
            }
            break;

        case 'POST':
            $institucion->add([
                'nombre'         => inputString($data, 'nombre'),
                'siglas'         => inputString($data, 'siglas'),
                'tipo'           => inputString($data, 'tipo', 'empresa'),
                'contacto_email' => inputString($data, 'contacto_email'),
                'sitio_web'      => inputString($data, 'sitio_web')
            ]);
            break;

        case 'PUT':
            $institucion->update([
                'id'             => inputString($data, 'id'),
                'nombre'         => inputString($data, 'nombre'),
                'siglas'         => inputString($data, 'siglas'),
                'tipo'           => inputString($data, 'tipo', 'empresa'),
                'contacto_email' => inputString($data, 'contacto_email'),
                'sitio_web'      => inputString($data, 'sitio_web')
            ]);
            break;

        case 'DELETE':
            $institucion->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
