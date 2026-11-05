<?php

require_once __DIR__ . "/../models/oportunidades.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/request.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# GET: cualquier usuario logueado. POST/PUT/DELETE: solo administrador (2) o reclutador (3).
# requireAuth corta con error si no hay sesión o no tiene el rol, y en métodos de escritura valida el CSRF.
$auth_data = requireAuth($method === 'GET' ? [] : [1, 2, 3]);

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    $oportunidad = new Oportunidades($connection, $response);

    switch ($method) {
        case 'GET':
            $id         = (int)($_GET['id'] ?? 0);
            $creado_por = (int)($_GET['creado_por'] ?? 0);
            $todas      = trim($_GET['todas'] ?? '');
            $carrera_id = (int)($_GET['carrera_id'] ?? 0);
            $modalidad  = trim($_GET['modalidad'] ?? '');
            $limit = (int) ($_GET["limit"] ?? 20);
            $cursor= (int) ($_GET["cursor"] ?? 0);

            if ($id > 0) {
                $oportunidad->findById($id);
            } elseif ($creado_por > 0) {
                $oportunidad->findByCreador($creado_por);
            } elseif ($todas === '1') {
                $oportunidad->findAll();
            } else {
                $oportunidad->feed($cursor, $carrera_id, $modalidad, $limit);
            }
            break;

        case 'POST':
            $oportunidad->add([
                'titulo'            => inputString($data, 'titulo'),
                'descripcion'       => inputString($data, 'descripcion'),
                'requisitos'        => inputString($data, 'requisitos'),
                'institucion_id'    => inputString($data, 'institucion_id'),
                'carrera_id'        => inputString($data, 'carrera_id'),
                'modalidad'         => inputString($data, 'modalidad', 'presencial'),
                'ubicacion'         => inputString($data, 'ubicacion'),
                'fecha_publicacion' => inputString($data, 'fecha_publicacion'),
                'fecha_cierre'      => inputString($data, 'fecha_cierre'),
                'creado_por'        => $auth_data['id'] # sale de la cookie, no del cuerpo
            ]);
            break;

        case 'PUT':
            $oportunidad->update([
                'id'                 => inputString($data, 'id'),
                'titulo'             => inputString($data, 'titulo'),
                'descripcion'        => inputString($data, 'descripcion'),
                'requisitos'         => inputString($data, 'requisitos'),
                'institucion_id'     => inputString($data, 'institucion_id'),
                'carrera_id'         => inputString($data, 'carrera_id'),
                'modalidad'          => inputString($data, 'modalidad', 'presencial'),
                'ubicacion'          => inputString($data, 'ubicacion'),
                'fecha_publicacion'  => inputString($data, 'fecha_publicacion'),
                'fecha_cierre'       => inputString($data, 'fecha_cierre'),
                'estado_oportunidad' => inputString($data, 'estado_oportunidad', 'activa'),
                'visto'              => inputString($data, 'visto', '0')
            ]);
            break;

        case 'DELETE':
            $oportunidad->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
