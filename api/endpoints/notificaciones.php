<?php

require_once __DIR__ . "/../models/notificaciones.php";
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
$auth       = requireAuth();
$auth_id    = (int)$auth['id'];

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

/*
 * Reglas de acceso:
 *  - Cada usuario solo ve, marca y elimina SUS notificaciones.
 *  - El admin puede ver las de cualquiera (?usuario_id=X o ?todas=1) y crear/editar notificaciones.
 *  - Las notificaciones automáticas (postulaciones, solicitudes) se crean en el backend,
 *    no pasan por este POST.
 */
try {
    $notificacion = new Notificaciones($connection, $response);

    switch ($method) {
        case 'GET':
            $id             = (int)($_GET['id'] ?? 0);
            $usuario_id     = (int)($_GET['usuario_id'] ?? 0);
            $solo_no_leidas = trim($_GET['no_leidas'] ?? '') === '1';

            if ($id > 0) {
                exigirPermiso(esAdmin($auth) || duenoNotificacion($connection, $id) === $auth_id);
                $notificacion->findById($id);
            } elseif (isset($_GET['todas'])) {
                exigirAdmin($auth);
                $notificacion->findAll();
            } else {
                # Sin usuario_id -> las propias
                $destino = $usuario_id > 0 ? $usuario_id : $auth_id;
                exigirPermiso($destino === $auth_id || esAdmin($auth));
                $notificacion->findByUsuario($destino, $solo_no_leidas);
            }
            break;

        case 'POST':
            exigirAdmin($auth);
            # accion=masivo { destino: "todos" | <rol_id>, titulo, mensaje, enlace? }
            if (inputString($data, 'accion') === 'masivo') {
                $destino = inputString($data, 'destino', 'todos');
                $notificacion->addMasivo([
                    'titulo'  => inputString($data, 'titulo'),
                    'mensaje' => inputString($data, 'mensaje'),
                    'enlace'  => inputString($data, 'enlace')
                ], $destino === 'todos' ? 0 : max(0, (int)$destino));
                break;
            }
            $notificacion->add([
                'usuario_id' => inputString($data, 'usuario_id'),
                'titulo'     => inputString($data, 'titulo'),
                'mensaje'    => inputString($data, 'mensaje'),
                'enlace'     => inputString($data, 'enlace')
            ]);
            break;

        case 'PUT':
            $accion = inputString($data, 'accion');

            if ($accion === 'leer_todas') {
                # Siempre las del usuario de la sesión
                $notificacion->markAllRead($auth_id);
            } elseif ($accion === 'leer') {
                # { accion: "leer", id, leido: 1|0 } -> solo el destinatario
                $id = (int)inputString($data, 'id', '0');
                exigirPermiso(duenoNotificacion($connection, $id) === $auth_id);
                $notificacion->markRead($id, (int)inputString($data, 'leido', '1'));
            } else {
                # Edición completa (título/mensaje): solo admin
                exigirAdmin($auth);
                $notificacion->update([
                    'id'      => inputString($data, 'id'),
                    'titulo'  => inputString($data, 'titulo'),
                    'mensaje' => inputString($data, 'mensaje'),
                    'leido'   => inputString($data, 'leido', '0')
                ]);
            }
            break;

        case 'DELETE':
            $id = (int)($_GET['id'] ?? 0);
            exigirPermiso(esAdmin($auth) || duenoNotificacion($connection, $id) === $auth_id);
            $notificacion->delete($id);
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
