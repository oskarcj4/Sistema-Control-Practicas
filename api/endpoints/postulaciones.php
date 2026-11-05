<?php

require_once __DIR__ . "/../models/postulaciones.php";
require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/request.php";
require_once __DIR__ . "/../core/upload.php";
require_once __DIR__ . "/../core/storage/storage.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, QUERY, DELETE");
header("Content-Type: application/json");

/**
 * Archivos que acepta el formulario de postulación.
 *   campo    -> nombre del <input type="file"> en el FormData
 *   formatos -> extensiones y MIME permitidos (ver Upload::PDF / Upload::IMAGEN)
 *   carpeta  -> prefijo de la llave dentro del almacenamiento
 * El peso máximo es UPLOAD_MAX_MB del .env.
 */
const DOCUMENTOS_POSTULACION = [
    'cv' => [
        'etiqueta' => 'CV',
        'formatos' => Upload::PDF,
        'carpeta'  => 'postulaciones/cv',
    ],
    'constancia_estudios' => [
        'etiqueta' => 'constancia de estudios',
        'formatos' => Upload::PDF + Upload::IMAGEN,
        'carpeta'  => 'postulaciones/constancias',
    ],
];

$connection = Connection::load();
$response   = new Response();
$method     = $_SERVER["REQUEST_METHOD"];

# POST lleva formulario + archivos => multipart/form-data.
# PUT/QUERY siguen siendo JSON (cambio de estado y edición de datos sin archivos).
if ($method === 'POST') {
    if (!Upload::isMultipart()) {
        Response::error("Petición inválida: la postulación se envía como multipart/form-data.", -1, httpCode: 400);
    }
    $data = Upload::readMultipartInput();
} else {
    $data = readJsonInput($method);
}

/** Valida (sin subir) un archivo del formulario. */
function documentoPostulacion(string $campo, bool $requerido): ?array
{
    $config = DOCUMENTOS_POSTULACION[$campo];
    return Upload::validate($campo, $config['etiqueta'], $config['formatos'], $requerido);
}

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
            if (inputString($data, 'accion') === 'actualizar') {
                # ---- Editar una postulación pendiente (datos y/o archivos) ----
                $id     = (int)inputString($data, 'id');
                $actual = $postulacion->buscarEditable($id);

                # 1. Validar todo antes de subir nada
                $formulario = $postulacion->validarFormulario($data, $actual);
                $cv         = documentoPostulacion('cv', false);
                $constancia = documentoPostulacion('constancia_estudios', false);
                $quitarConstancia = inputString($data, 'quitar_constancia') === '1';

                # 2. Subir los archivos nuevos y obtener sus URLs
                $subidas = new UploadTransaction(Storage::driver());
                $documentos = [
                    'cv_url'                  => $actual['cv_url'],
                    'constancia_estudios_url' => $actual['constancia_estudios_url'],
                ];
                if ($cv) {
                    $documentos['cv_url'] = $subidas->store($cv, DOCUMENTOS_POSTULACION['cv']['carpeta']);
                    $subidas->replaceOnSuccess($actual['cv_url']);
                }
                if ($constancia) {
                    $documentos['constancia_estudios_url'] = $subidas->store($constancia, DOCUMENTOS_POSTULACION['constancia_estudios']['carpeta']);
                    $subidas->replaceOnSuccess($actual['constancia_estudios_url']);
                } elseif ($quitarConstancia) {
                    $documentos['constancia_estudios_url'] = null;
                    $subidas->replaceOnSuccess($actual['constancia_estudios_url']);
                }

                # 3. Guardar las URLs en la base de datos
                $postulacion->actualizar($id, $formulario, $documentos);
            } else {
                # ---- Nueva postulación ----
                $oportunidad_id = (int)inputString($data, 'oportunidad_id');
                $estudiante_id  = (int)inputString($data, 'estudiante_id');

                # 1. Validar formulario, archivos y reglas de negocio antes de subir nada
                $formulario = $postulacion->validarFormulario($data);
                $cv         = documentoPostulacion('cv', true);
                $constancia = documentoPostulacion('constancia_estudios', false);
                $previa     = $postulacion->validarAlta($oportunidad_id, $estudiante_id);

                # 2. Subir los archivos y obtener sus URLs
                $subidas = new UploadTransaction(Storage::driver());
                $documentos = [
                    'cv_url'                  => $subidas->store($cv, DOCUMENTOS_POSTULACION['cv']['carpeta']),
                    'constancia_estudios_url' => $constancia
                        ? $subidas->store($constancia, DOCUMENTOS_POSTULACION['constancia_estudios']['carpeta'])
                        : null,
                ];
                if ($previa) {
                    # Reactivación de una postulación retirada: los archivos viejos sobran
                    $subidas->replaceOnSuccess($previa['cv_url']);
                    $subidas->replaceOnSuccess($previa['constancia_estudios_url']);
                }

                # 3. Guardar las URLs en la base de datos
                $postulacion->registrar($oportunidad_id, $estudiante_id, $previa, $formulario, $documentos);
            }
            break;

        case 'PUT':
            # accion=estado -> el reclutador cambia el estado (queda en historial)
            # sin accion    -> el estudiante edita los datos del formulario (sin archivos; para archivos usar POST accion=actualizar)
            if (inputString($data, 'accion') === 'estado') {
                $postulacion->changeState([
                    'id'                 => inputString($data, 'id'),
                    'estado_postulacion' => inputString($data, 'estado_postulacion'),
                    'comentario'         => inputString($data, 'comentario'),
                    'actualizado_por'    => inputString($data, 'actualizado_por')
                ]);
            } else {
                $id         = (int)inputString($data, 'id');
                $actual     = $postulacion->buscarEditable($id);
                $formulario = $postulacion->validarFormulario($data, $actual);
                $postulacion->actualizar($id, $formulario, [
                    'cv_url'                  => $actual['cv_url'],
                    'constancia_estudios_url' => $actual['constancia_estudios_url'],
                ]);
            }
            break;

        case 'DELETE':
            $postulacion->delete((int)($_GET['id'] ?? 0));
            break;

        default:
            Response::invalidMethod();
    }
} catch (StorageException $e) {
    # Falla de disco/S3 o .env mal configurado. Los archivos ya subidos se borran solos.
    Response::error("No se pudo guardar el archivo. Inténtelo de nuevo.");
    //Response::debugError($e);
} catch (\Throwable $th) {
    Response::error("Error");
    //Response::debugError($th);
}
