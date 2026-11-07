<?php

require_once __DIR__ . "/../models/solicitudes_publicacion.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/request.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/permisos.php";
require_once __DIR__ . "/../core/upload.php";
require_once __DIR__ . "/../core/storage.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# Toda la API de solicitudes exige sesión; escritura valida CSRF dentro de requireAuth.
$auth   = requireAuth();
$propio = (int)$auth['id'];

/*
 * POST va como multipart/form-data (campos + archivo opcional "documento_respaldo"):
 *   - sin accion            -> crear solicitud
 *   - accion=actualizar     -> editar la solicitud pendiente (id, archivo nuevo opcional,
 *                              quitar_documento=1 para borrar el adjunto actual)
 * PUT sigue siendo JSON: accion=revisar (admin aprueba / rechaza).
 */
const DOCUMENTO_RESPALDO = [
    'campo'    => 'documento_respaldo',
    'etiqueta' => 'documento de respaldo',
    'carpeta'  => 'solicitudes/respaldo',
];

if ($method === 'POST') {
    if (!Upload::isMultipart()) {
        Response::error("Petición inválida: la solicitud se envía como multipart/form-data.", -1, 400);
    }
    $data = Upload::readMultipartInput();
} else {
    $data = readJsonInput($method);
}

/** Valida y sube el adjunto si viene; devuelve su URL o null. */
function subirDocumentoRespaldo(): ?string
{
    $archivo = Upload::validate(
        DOCUMENTO_RESPALDO['campo'],
        DOCUMENTO_RESPALDO['etiqueta'],
        Upload::PDF + Upload::IMAGEN,
        false
    );
    return $archivo === null ? null : Storage::guardar($archivo, DOCUMENTO_RESPALDO['carpeta']);
}

try {
    $solicitud = new SolicitudesPublicacion($connection, $response);

    switch ($method) {
        case 'GET':
            $id               = (int)($_GET['id'] ?? 0);
            $usuario_id       = (int)($_GET['usuario_id'] ?? 0);
            $estado_solicitud = trim($_GET['estado_solicitud'] ?? '');

            if ($id > 0) {
                # Admin o dueño de la solicitud
                exigirPermiso(esAdmin($auth) || duenoSolicitud($connection, $id) === $propio);
                $solicitud->findById($id);
            } elseif ($usuario_id > 0) {
                exigirPermiso(esAdmin($auth) || $usuario_id === $propio);
                $solicitud->findByUsuario($usuario_id);
            } elseif ($estado_solicitud !== '') {
                exigirAdmin($auth);
                $solicitud->findByEstado($estado_solicitud);
            } else {
                exigirAdmin($auth);
                $solicitud->findAll();
            }
            break;

        case 'POST':
            if (inputString($data, 'accion') === 'actualizar') {
                # Solo el dueño edita su solicitud (el modelo exige que siga pendiente)
                $id = (int)inputString($data, 'id', '0');
                exigirPermiso(duenoSolicitud($connection, $id) === $propio);

                # Se conserva el adjunto actual salvo que llegue uno nuevo o se pida quitarlo
                $actual = filaUnica($connection, "SELECT documento_respaldo_url FROM solicitudes_publicacion WHERE id = ?", [$id]);
                $url = (string)($actual['documento_respaldo_url'] ?? '');
                $conservado = true;
                if (inputString($data, 'quitar_documento') === '1') {
                    $url = '';
                }
                $nueva = subirDocumentoRespaldo();
                if ($nueva !== null) {
                    $url = $nueva;
                    $conservado = false;
                }

                $solicitud->update([
                    'id'                           => (string)$id,
                    'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                    'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                    'documento_respaldo_url'       => $url,
                    'documento_conservado'         => $conservado
                ]);
            } else {
                $solicitud->add([
                    'usuario_id'                   => (string)$propio, # sale de la cookie, no del cuerpo
                    'nombre_organizacion_proyecto' => inputString($data, 'nombre_organizacion_proyecto'),
                    'descripcion_actividades'      => inputString($data, 'descripcion_actividades'),
                    'documento_respaldo_url'       => subirDocumentoRespaldo() ?? ''
                ]);
            }
            break;

        case 'PUT':
            # accion=revisar -> el admin aprueba/rechaza (la edición del solicitante va por POST accion=actualizar)
            if (inputString($data, 'accion') !== 'revisar') {
                Response::error("Acción no válida. Para editar use POST con accion=actualizar.", -1, 400);
            }
            exigirAdmin($auth);
            $solicitud->review([
                'id'               => inputString($data, 'id'),
                'estado_solicitud' => inputString($data, 'estado_solicitud'),
                'comentario_admin' => inputString($data, 'comentario_admin'),
                'revisado_por'     => (string)$propio # sale de la cookie
            ]);
            break;

        case 'DELETE':
            # Admin borra cualquiera; el dueño solo cancela mientras está pendiente
            $id = (int)($_GET['id'] ?? 0);
            if (!esAdmin($auth)) {
                exigirPermiso(duenoSolicitud($connection, $id) === $propio);
                $pendiente = filaUnica($connection, "SELECT id FROM solicitudes_publicacion WHERE id = ? AND estado = 1 AND estado_solicitud = 'pendiente'", [$id]);
                if ($pendiente === null) {
                    Response::error("La solicitud ya fue revisada y no se puede cancelar", -1, 409);
                }
            }
            $solicitud->delete($id);
            break;

        default:
            Response::invalidMethod();
    }
} catch (StorageException $e) {
    Response::error("No se pudo guardar el archivo. Inténtelo de nuevo.", -1, 500);
    //Response::debugError($e);
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
