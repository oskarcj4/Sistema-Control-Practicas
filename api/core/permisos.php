<?php

declare(strict_types=1);
require_once __DIR__ . "/response.php";

/**
 * Helpers de autorización a nivel de recurso (dueño / rol).
 * requireAuth() valida sesión, rol y CSRF; estas funciones validan
 * que el usuario de la sesión pueda tocar UN registro concreto.
 */

const ROL_ESTUDIANTE = 1;
const ROL_ADMIN      = 2;
const ROL_RECLUTADOR = 3;

function esAdmin(array $auth): bool
{
    return boolval($auth['isAdmin'] ?? false);
}

function tieneRol(array $auth, int $rol): bool
{
    $roles = array_map('intval', explode(',', (string)($auth['roles'] ?? '')));
    return in_array($rol, $roles, true);
}

/** Corta con 403 si la condición no se cumple. */
function exigirPermiso(bool $permitido): void
{
    if (!$permitido) {
        Response::error("No tienes permisos para realizar esta acción", -1, 403);
    }
}

/** Corta con 403 si el usuario no es administrador. */
function exigirAdmin(array $auth): void
{
    exigirPermiso(esAdmin($auth));
}

/**
 * Ejecuta una consulta que devuelve una sola fila y la retorna (o null).
 * Pensado para buscar el dueño de un registro antes de modificarlo.
 */
function filaUnica(PDO $connection, string $sql, array $params): ?array
{
    $stmt = $connection->prepare($sql);
    $stmt->execute($params);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    return $fila ?: null;
}

/**
 * Dueños de una postulación: el estudiante que la creó y el creador de la oferta.
 * Corta con 404 si no existe.
 */
function duenosPostulacion(PDO $connection, int $postulacion_id): array
{
    $fila = filaUnica($connection,
        "SELECT p.estudiante_id, o.creado_por
           FROM postulaciones p
           INNER JOIN oportunidades o ON o.id = p.oportunidad_id
          WHERE p.id = ? AND p.estado = 1",
        [$postulacion_id]);

    if ($fila === null) {
        Response::error("Postulación no encontrada", -1, 404);
    }
    return ['estudiante_id' => (int)$fila['estudiante_id'], 'creado_por' => (int)$fila['creado_por']];
}

/** Creador de una oportunidad. Corta con 404 si no existe. */
function creadorOportunidad(PDO $connection, int $oportunidad_id): int
{
    $fila = filaUnica($connection, "SELECT creado_por FROM oportunidades WHERE id = ? AND estado = 1", [$oportunidad_id]);
    if ($fila === null) {
        Response::error("Oportunidad no encontrada", -1, 404);
    }
    return (int)$fila['creado_por'];
}

/** Dueño de una solicitud de publicación. Corta con 404 si no existe. */
function duenoSolicitud(PDO $connection, int $solicitud_id): int
{
    $fila = filaUnica($connection, "SELECT usuario_id FROM solicitudes_publicacion WHERE id = ? AND estado = 1", [$solicitud_id]);
    if ($fila === null) {
        Response::error("Solicitud no encontrada", -1, 404);
    }
    return (int)$fila['usuario_id'];
}
