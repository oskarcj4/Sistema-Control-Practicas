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
if ($auth_data !== null) {
    $esAdmin  = boolval($auth_data['isAdmin']);
    $propioId = (int)$auth_data['id'];

    if ($method === 'GET' && !$esAdmin && (int)($_GET['id'] ?? 0) !== $propioId) {
        Response::invalidAccess();
    }
    if ($method === 'PUT' && !$esAdmin) {
        if ((int)inputString($data, 'id', '0') !== $propioId) {
            Response::invalidAccess();
        }
        # Un usuario normal no puede suspender/reactivar su cuenta
        $data['estado_cuenta'] = 'activo';
    }
    if ($method === 'DELETE' && !$esAdmin) {
        Response::invalidAccess();
    }
}

try {
    $usuario = new Usuarios($connection, $response);

    switch ($method) {
        case 'GET':
            $id     = (int)($_GET['id'] ?? 0);
            $email  = trim($_GET['email'] ?? '');
            $rol_id = (int)($_GET['rol_id'] ?? 0);

            if ($id > 0) {
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
                'rol_id'         => inputString($data, 'rol_id'),
                'institucion_id' => inputString($data, 'institucion_id'),
                'carrera_id'     => inputString($data, 'carrera_id'),
                'carnet'         => inputString($data, 'carnet'),
                'telefono'       => inputString($data, 'telefono'),
                'biografia'      => inputString($data, 'biografia')
            ]);
            break;

        case 'PUT':
            $usuario->update([
                'id'             => inputString($data, 'id'),
                'username'       => inputString($data, 'username'),
                'nombre'         => inputString($data, 'nombre'),
                'apellido'       => inputString($data, 'apellido'),
                'email'          => inputString($data, 'email'),
                'rol_id'         => inputString($data, 'rol_id'),
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
