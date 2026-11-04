<?php

require_once __DIR__ . "/../models/usuarios.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";

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

# POST (registro) es público. El resto exige sesión; PUT/DELETE además validan CSRF.
# Un usuario normal solo puede ver/editar su propio registro; el admin puede todo.
$auth_data = null;
if ($method !== 'POST') {
    $auth_data = requireAuth();
    $esAdmin   = boolval($auth_data['isAdmin']);
    $propioId  = (int)$auth_data['id'];

    if ($method === 'GET' && !$esAdmin && (int)($_GET['id'] ?? 0) !== $propioId) {
        Response::invalidAccess();
    }
    if ($method === 'PUT' && !$esAdmin) {
        if ((int)($_PUT['id'] ?? 0) !== $propioId) {
            Response::invalidAccess();
        }
        # Un usuario normal no puede suspender/reactivar su cuenta
        $_PUT['estado_cuenta'] = 'activo';
    }
    if ($method === 'DELETE' && !$esAdmin) {
        Response::invalidAccess();
    }
}

switch ($method) {
    case 'GET':
        $id     = trim($_GET['id'] ?? '');
        $email  = trim($_GET['email'] ?? '');
        $rol_id = trim($_GET['rol_id'] ?? '');

        try {
            $usuario = new Usuarios($connection, $response);
            if (!empty($id)) {
                $usuario->findById((int)$id);
            } elseif (!empty($email)) {
                $usuario->findByEmail($email);
            } elseif (!empty($rol_id)) {
                $usuario->findByRol((int)$rol_id);
            } else {
                $usuario->findAll();
            }
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'POST':
        $usuarioData = [
            'username'       => trim($_POST['username'] ?? ''),
            'nombre'         => trim($_POST['nombre'] ?? ''),
            'apellido'       => trim($_POST['apellido'] ?? ''),
            'email'          => trim($_POST['email'] ?? ''),
            'password'       => $_POST['password'] ?? '',
            'rol_id'         => trim($_POST['rol_id'] ?? ''),
            'institucion_id' => trim($_POST['institucion_id'] ?? ''),
            'carrera_id'     => trim($_POST['carrera_id'] ?? ''),
            'carnet'         => trim($_POST['carnet'] ?? ''),
            'telefono'       => trim($_POST['telefono'] ?? ''),
            'biografia'      => trim($_POST['biografia'] ?? '')
        ];

        try {
            $usuario = new Usuarios($connection, $response);
            $usuario->add($usuarioData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'PUT':
        $usuarioData = [
            'id'             => trim($_PUT['id'] ?? ''),
            'username'       => trim($_PUT['username'] ?? ''),
            'nombre'         => trim($_PUT['nombre'] ?? ''),
            'apellido'       => trim($_PUT['apellido'] ?? ''),
            'email'          => trim($_PUT['email'] ?? ''),
            'rol_id'         => trim($_PUT['rol_id'] ?? ''),
            'institucion_id' => trim($_PUT['institucion_id'] ?? ''),
            'carrera_id'     => trim($_PUT['carrera_id'] ?? ''),
            'carnet'         => trim($_PUT['carnet'] ?? ''),
            'telefono'       => trim($_PUT['telefono'] ?? ''),
            'biografia'      => trim($_PUT['biografia'] ?? ''),
            'estado_cuenta'  => trim($_PUT['estado_cuenta'] ?? 'activo')
        ];

        try {
            $usuario = new Usuarios($connection, $response);
            $usuario->update($usuarioData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        $id = (int)($_DELETE['id'] ?? $_GET['id'] ?? 0);

        try {
            $usuario = new Usuarios($connection, $response);
            $usuario->delete($id);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
