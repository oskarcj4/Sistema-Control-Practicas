<?php

require_once __DIR__ . "/../models/notificaciones.php";
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
$auth       = requireAuth();

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    $notificacion = new Notificaciones($connection, $response);

    switch ($method) {
        case 'GET':
            $id             = (int)($_GET['id'] ?? 0);
            $usuario_id     = (int)($_GET['usuario_id'] ?? 0);
            $solo_no_leidas = trim($_GET['no_leidas'] ?? '') === '1';

            if ($id > 0) {
                $notificacion->findById($id);
            } elseif ($usuario_id > 0) {
                $notificacion->findByUsuario($usuario_id, $solo_no_leidas);
            } else {
                $notificacion->findAll();
            }
            break;

        case 'POST':
            $notificacion->add([
                'usuario_id' => inputString($data, 'usuario_id'),
                'titulo'     => inputString($data, 'titulo'),
                'mensaje'    => inputString($data, 'mensaje')
            ]);
            break;

        case 'PUT':
            # accion=leer_todas -> marca leídas todas las del usuario; sin accion -> edita una notificación
            if (inputString($data, 'accion') === 'leer_todas') {
                $notificacion->markAllRead((int)inputString($data, 'usuario_id', '0'));
            } else {
                $notificacion->update([
                    'id'      => inputString($data, 'id'),
                    'titulo'  => inputString($data, 'titulo'),
                    'mensaje' => inputString($data, 'mensaje'),
                    'leido'   => inputString($data, 'leido', '0')
                ]);
            }
            break;

        case 'DELETE':
            $notificacion->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
