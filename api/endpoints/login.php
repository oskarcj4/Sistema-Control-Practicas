<?php

require_once __DIR__ . "/../models/login.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/request.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
header("Content-Type: application/json");

# Preflight CORS (solo aplica si el frontend llama a Apache directo, sin el proxy de Vite)
if (($_SERVER["REQUEST_METHOD"] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# POST: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    switch ($method) {
        case 'GET':
            # Al cargar la página: si la cookie es válida devuelve la sesión y un csrfToken nuevo
            $auth_data = checkAuth();
            if ($auth_data === null) {
                Response::error("Usuario no autenticado", -2);
            }

            Response::success([
                'id'        => $auth_data['id'],
                'username'  => $auth_data['username'],
                'name'      => $auth_data['name'],
                'roles'     => $auth_data['roles'],
                'isAdmin'   => $auth_data['isAdmin'],
                'csrfToken' => csrfToken()
            ]);
            break;

        case 'POST':
            $login = new Login($connection, $response);
            $login->login([
                'identificador' => inputString($data, 'identificador'),
                # La contraseña no se recorta: los espacios son parte de ella
                'contrasena'    => is_string($data['contrasena'] ?? null) ? $data['contrasena'] : ''
            ]);
            break;

        case 'DELETE':
            requireAuth();
            $login = new Login($connection, $response);
            $login->logout();
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
