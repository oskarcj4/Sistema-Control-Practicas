<?php

require_once __DIR__ . "/../models/notificaciones.php";
require_once __DIR__ . "/../core/connection.php";
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");


$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];
$auth = requireAuth();

# PHP no llena $_PUT / $_DELETE: se leen del cuerpo (x-www-form-urlencoded)
if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);
} elseif ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

switch ($method) {
    case 'GET':
        $id             = trim($_GET['id'] ?? '');
        $usuario_id     = trim($_GET['usuario_id'] ?? '');
        $solo_no_leidas = trim($_GET['no_leidas'] ?? '') === '1';

        try {
            $notificacion = new Notificaciones($connection, $response);
            if (!empty($id)) {
                $notificacion->findById((int)$id);
            } elseif (!empty($usuario_id)) {
                $notificacion->findByUsuario((int)$usuario_id, $solo_no_leidas);
            } else {
                $notificacion->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $notificacionData = [
            'usuario_id' => trim($_POST['usuario_id'] ?? ''),
            'titulo'     => trim($_POST['titulo'] ?? ''),
            'mensaje'    => trim($_POST['mensaje'] ?? '')
        ];

        try {
            $notificacion = new Notificaciones($connection, $response);
            $notificacion->add($notificacionData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        # accion=leer_todas -> marca leídas todas las del usuario; sin accion -> edita una notificación
        $accion = trim($_PUT['accion'] ?? '');

        try {
            $notificacion = new Notificaciones($connection, $response);
            if ($accion === 'leer_todas') {
                $notificacion->markAllRead((int)($_PUT['usuario_id'] ?? 0));
            } else {
                $notificacion->update([
                    'id'      => trim($_PUT['id'] ?? ''),
                    'titulo'  => trim($_PUT['titulo'] ?? ''),
                    'mensaje' => trim($_PUT['mensaje'] ?? ''),
                    'leido'   => trim($_PUT['leido'] ?? '0')
                ]);
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $notificacion = new Notificaciones($connection, $response);
            $notificacion->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
