<?php

require_once __DIR__. "../core/auth-middleware.php";
require_once __DIR__ . "../core/request.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Alow-Methods: PUT");
header("Content-Type: application/json");

$method = $_SERVER["REQUEST_METHOD"];
if ($method !== 'PUT') {
    Response::invalidMethod();
}

requireAuth([1,2,3]);
$data = readJsonInput("PUT");
$connection = new Connection();
$response = new Response();

try {
  $cambioContrasena = new Usuarios($connection, $response);
  $cambioContrasena->changePassword([
                'id'             => inputString($data, 'id'),
                'password_actual'       => inputString($data, 'password_actual'),
                'password_nueva'         => inputString($data, 'password_nueva'),
                'password_nueva_confirmacion'=> inputString($data, 'password_nueva_confirmacion')
            ]);
}
catch(Exception $e){
  Response::error("Ocurrio un error", -1, 500);
}
