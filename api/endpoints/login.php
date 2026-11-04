<?php

require_once __DIR__ . "/../models/login.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";

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
        $loginData = [
            'identificador' => trim($_POST['identificador'] ?? ''),
            'contrasena'    => $_POST['contrasena'] ?? ''
        ];

        try {
            $login = new Login($connection, $response);
            $login->login($loginData);
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    case 'DELETE':
        requireAuth();

        try {
            $login = new Login($connection, $response);
            $login->logout();
        } catch (\Throwable $th) {
            Response::error("Error");
            //Response::debugError($th);
        }
        break;

    default:
        Response::invalidMethod();
}
