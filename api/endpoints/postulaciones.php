<?php

require_once __DIR__ . "/../models/postulaciones.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/request.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# POST/PUT/QUERY: valida Content-Type y lee el JSON una sola vez
$data = readJsonInput($method);

try {
    $postulacion = new Postulaciones($connection, $response);

    switch ($method) {
        case 'GET':
            $id             = (int)($_GET['id'] ?? 0);
            $estudiante_id  = (int)($_GET['estudiante_id'] ?? 0);
            $oportunidad_id = (int)($_GET['oportunidad_id'] ?? 0);

            if ($id > 0) {
                $postulacion->findById($id);
            } elseif ($estudiante_id > 0) {
                $postulacion->findByEstudiante($estudiante_id);
            } elseif ($oportunidad_id > 0) {
                $postulacion->findByOportunidad($oportunidad_id);
            } else {
                $postulacion->findAll();
            }
            break;

        case 'POST':
            $postulacion->add([
                'oportunidad_id'          => inputString($data, 'oportunidad_id'),
                'estudiante_id'           => inputString($data, 'estudiante_id'),
                'cv_url'                  => inputString($data, 'cv_url'),
                'constancia_estudios_url' => inputString($data, 'constancia_estudios_url'),
                'mensaje_presentacion'    => inputString($data, 'mensaje_presentacion')
            ]);
            break;

        case 'PUT':
            # accion=estado -> el reclutador cambia el estado (queda en historial); sin accion -> el estudiante edita
            if (inputString($data, 'accion') === 'estado') {
                $postulacion->changeState([
                    'id'                 => inputString($data, 'id'),
                    'estado_postulacion' => inputString($data, 'estado_postulacion'),
                    'comentario'         => inputString($data, 'comentario'),
                    'actualizado_por'    => inputString($data, 'actualizado_por')
                ]);
            } else {
                $postulacion->update([
                    'id'                      => inputString($data, 'id'),
                    'cv_url'                  => inputString($data, 'cv_url'),
                    'constancia_estudios_url' => inputString($data, 'constancia_estudios_url'),
                    'mensaje_presentacion'    => inputString($data, 'mensaje_presentacion')
                ]);
            }
            break;

        case 'DELETE':
            $postulacion->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
