<?php

require_once __DIR__ . "/../models/asignaciones_roles.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/request.php";
require_once __DIR__ . "/../core/permisos.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# GET: cualquier usuario logueado (solo sus roles, salvo admin). POST/DELETE: solo administrador, con CSRF.
$auth   = requireAuth($method === 'GET' ? [] : [ROL_ADMIN]);
$propio = (int)$auth['id'];

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    $asignacion = new AsignacionesRoles($connection, $response);

    switch ($method) {
        case 'GET':
            $id_usuario = (int)($_GET['id_usuario'] ?? 0);
            if ($id_usuario > 0) {
                exigirPermiso(esAdmin($auth) || $id_usuario === $propio);
                $asignacion->findByUsuario($id_usuario);
            } else {
                exigirAdmin($auth);
                $asignacion->findAll();
            }
            break;

        case 'POST':
            $asignacion->add([
                'id_usuario' => inputString($data, 'id_usuario'),
                'id_rol'     => inputString($data, 'id_rol')
            ], $propio);
            break;

        case 'DELETE':
            $id_usuario = (int)($_GET['id_usuario'] ?? 0);
            $id_rol     = (int)($_GET['id_rol'] ?? 0);
            $asignacion->delete($id_usuario, $id_rol, $propio);
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
