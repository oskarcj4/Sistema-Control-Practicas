<?php

require_once __DIR__ . "/../models/oportunidades.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# GET: cualquier usuario logueado. POST/PUT/DELETE: solo administrador (2) o reclutador (3).
# requireAuth corta con error si no hay sesión o no tiene el rol, y en métodos de escritura valida el CSRF.
$auth_data = requireAuth($method === 'GET' ? [] : [2, 3]);



# PHP no llena $_PUT / $_DELETE: se leen del cuerpo (x-www-form-urlencoded)
if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);
} elseif ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

switch ($method) {
    case 'GET':
        $id         = trim($_GET['id'] ?? '');
        $creado_por = trim($_GET['creado_por'] ?? '');
        $todas      = trim($_GET['todas'] ?? '');
        $carrera_id = (int)($_GET['carrera_id'] ?? 0);
        $modalidad  = trim($_GET['modalidad'] ?? '');

        try {
            $oportunidad = new Oportunidades($connection, $response);
            if (!empty($id)) {
                $oportunidad->findById((int)$id);
            } elseif (!empty($creado_por)) {
                $oportunidad->findByCreador((int)$creado_por);
            } elseif ($todas === '1') {
                $oportunidad->findAll();
            } else {
                $oportunidad->feed($carrera_id, $modalidad);
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $oportunidadData = [
            'titulo'            => trim($_POST['titulo'] ?? ''),
            'descripcion'       => trim($_POST['descripcion'] ?? ''),
            'requisitos'        => trim($_POST['requisitos'] ?? ''),
            'institucion_id'    => trim($_POST['institucion_id'] ?? ''),
            'carrera_id'        => trim($_POST['carrera_id'] ?? ''),
            'modalidad'         => trim($_POST['modalidad'] ?? 'presencial'),
            'ubicacion'         => trim($_POST['ubicacion'] ?? ''),
            'fecha_publicacion' => trim($_POST['fecha_publicacion'] ?? ''),
            'fecha_cierre'      => trim($_POST['fecha_cierre'] ?? ''),
            'creado_por'        => $auth_data['id'] # sale de la cookie, no del formulario
        ];

        try {
            $oportunidad = new Oportunidades($connection, $response);
            $oportunidad->add($oportunidadData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $oportunidadData = [
            'id'                => trim($_PUT['id'] ?? ''),
            'titulo'            => trim($_PUT['titulo'] ?? ''),
            'descripcion'       => trim($_PUT['descripcion'] ?? ''),
            'requisitos'        => trim($_PUT['requisitos'] ?? ''),
            'institucion_id'    => trim($_PUT['institucion_id'] ?? ''),
            'carrera_id'        => trim($_PUT['carrera_id'] ?? ''),
            'modalidad'         => trim($_PUT['modalidad'] ?? 'presencial'),
            'ubicacion'         => trim($_PUT['ubicacion'] ?? ''),
            'fecha_publicacion' => trim($_PUT['fecha_publicacion'] ?? ''),
            'fecha_cierre'      => trim($_PUT['fecha_cierre'] ?? ''),
            'estado_oportunidad' => trim($_PUT['estado_oportunidad'] ?? 'activa'),
            'visto'             => trim($_PUT['visto'] ?? '0')
        ];

        try {
            $oportunidad = new Oportunidades($connection, $response);
            $oportunidad->update($oportunidadData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $oportunidad = new Oportunidades($connection, $response);
            $oportunidad->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
