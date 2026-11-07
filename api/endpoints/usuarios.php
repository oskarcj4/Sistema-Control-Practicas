<?php

require_once __DIR__ . "/../models/usuarios.php";
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

# POST (registro) es público. El resto exige sesión; PUT/DELETE además validan CSRF.
# La sesión se valida antes de leer el cuerpo para no procesar JSON de usuarios anónimos.
$auth_data = null;
if ($method !== 'POST') {
    $auth_data = requireAuth();
}



# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

# Un usuario normal solo puede ver/editar su propio registro; el admin puede todo.
# Búsqueda por término (lupa) está permitida para cualquier usuario autenticado.
if ($auth_data !== null) {
    $esAdmin    = boolval($auth_data['isAdmin']);
    $propioId   = (int)$auth_data['id'];
    $esBusqueda = isset($_GET['q']) || isset($_GET['buscar']);

    if ($method === 'GET' && !$esAdmin && (int)($_GET['id'] ?? 0) !== $propioId && !$esBusqueda) {
        Response::invalidAccess();
    }
    # Permisos de publicación: solo admin
    if (!$esAdmin && (isset($_GET['publicadores']) || ($method === 'PUT' && inputString($data, 'accion') === 'permiso_publicar'))) {
        Response::invalidAccess();
    }
    if ($method === 'PUT' && !$esAdmin) {
        if ((int)inputString($data, 'id', '0') !== $propioId) {
            Response::invalidAccess();
        }
        # Un usuario normal no puede suspender/reactivar su cuenta
        $data['estado_cuenta'] = 'activo';
    }
    if ($method === 'DELETE' && !$esAdmin && (int)($_GET['id'] ?? 0) !== $propioId) {
        Response::invalidAccess();
    }
}

try {
    $usuario = new Usuarios($connection, $response);

    switch ($method) {
        case 'GET':
            $id      = (int)($_GET['id'] ?? 0);
            $email   = trim($_GET['email'] ?? '');
            $rol_id  = (int)($_GET['rol_id'] ?? 0);
            $termino = trim($_GET['q'] ?? $_GET['buscar'] ?? '');

            if (isset($_GET['publicadores'])) {
                $usuario->findPublicadores();
            } elseif ($termino !== '') {
                $usuario->search($termino, $esAdmin);
            } elseif ($id > 0) {
                $usuario->findById($id);
            } elseif ($email !== '') {
                $usuario->findByEmail($email);
            } elseif ($rol_id > 0) {
                $usuario->findByRol($rol_id);
            } else {
                $usuario->findAll();
            }
            break;

        case 'POST':
            $usuario->add([
                'username'       => inputString($data, 'username'),
                'nombre'         => inputString($data, 'nombre'),
                'apellido'       => inputString($data, 'apellido'),
                'email'          => inputString($data, 'email'),
                # La contraseña no se recorta: los espacios son parte de ella
                'password'       => is_string($data['password'] ?? null) ? $data['password'] : '',
                'institucion_id' => inputString($data, 'institucion_id'),
                'carrera_id'     => inputString($data, 'carrera_id'),
                'carnet'         => inputString($data, 'carnet'),
                'telefono'       => inputString($data, 'telefono'),
                'biografia'      => inputString($data, 'biografia')
            ]);
            break;

        case 'PUT':
            # accion=permiso_publicar { id, autorizar: 1|0, motivo, quitar_reclutador: 1|0, cerrar_ofertas: 1|0 }
            if (inputString($data, 'accion') === 'permiso_publicar') {
                $usuario->cambiarPermisoPublicar(
                    (int)inputString($data, 'id', '0'),
                    inputString($data, 'autorizar') === '1',
                    inputString($data, 'motivo'),
                    inputString($data, 'quitar_reclutador') === '1',
                    inputString($data, 'cerrar_ofertas') === '1'
                );
                break;
            }
            $usuario->update([
                'id'             => inputString($data, 'id'),
                'username'       => inputString($data, 'username'),
                'nombre'         => inputString($data, 'nombre'),
                'apellido'       => inputString($data, 'apellido'),
                'email'          => inputString($data, 'email'),
                'institucion_id' => inputString($data, 'institucion_id'),
                'carrera_id'     => inputString($data, 'carrera_id'),
                'carnet'         => inputString($data, 'carnet'),
                'telefono'       => inputString($data, 'telefono'),
                'biografia'      => inputString($data, 'biografia'),
                'estado_cuenta'  => inputString($data, 'estado_cuenta', 'activo')
            ]);
            break;

        case 'DELETE':
            $usuario->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
