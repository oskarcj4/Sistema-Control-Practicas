<?php

declare(strict_types=1);
require_once __DIR__ . "/auth.php";
require_once __DIR__ . "/response.php";
require_once __DIR__ . "/csrf.php";
require_once __DIR__ . "/audit-log.php";
require_once __DIR__ . "/connection.php";

/**
 * La cookie guarda roles del momento del login. Para que quitar un rol (por ejemplo
 * administrador) o suspender una cuenta surta efecto de inmediato, se releen
 * de la BD en cada petición. Corta la sesión si la cuenta ya no está activa.
 */
function refrescarAuthDesdeBD(array $data): array
{
    $stmt = Connection::load()->prepare("SELECT u.estado_cuenta,
                                                (SELECT GROUP_CONCAT(ar.id_rol ORDER BY ar.id_rol)
                                                   FROM asignaciones_roles ar
                                                  WHERE ar.id_usuario = u.id AND ar.estado = 1) AS roles
                                           FROM usuarios u WHERE u.id = ? AND u.estado = 1");
    $stmt->execute([(int)($data['id'] ?? 0)]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$fila || $fila['estado_cuenta'] !== 'activo') {
        Response::error("Tu sesión ya no es válida. Vuelve a iniciar sesión.", -2);
    }

    $roles = $fila['roles'] !== null ? array_map('intval', explode(',', (string)$fila['roles'])) : [];
    $data['roles']   = implode(',', $roles);
    $data['isAdmin'] = in_array(2, $roles, true);
    return $data;
}

/**
 * Valida que el usuario esté autenticado y tenga un rol permitido.
 *
 * @param int|int[] $roles Roles permitidos (por ejemplo 1 o [1,2])
 * @return array Datos del usuario autenticado
 */
function requireAuth(int|array $roles = [])
{
    $data = checkAuth();
    if ($data === null) {
        Response::error("Usuario no autenticado", -2);
    }
    $data = refrescarAuthDesdeBD($data);

    AuditLog::setUser($data);

    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'HEAD', 'OPTIONS', 'QUERY'], true)) {
        requireCsrfToken();
    }
    if ($roles === [] || $roles === null) {
        return $data;
    }

    if (boolval($data['isAdmin'])) {
        return $data;
    }

    $rolesUsuario = explode(',', $data['roles']);
    $esValido = false;
    foreach ($rolesUsuario as $rolUsuario) {
        if (in_array(intval($rolUsuario), (array)$roles, true)) {
            $esValido = true;
            break;
        }
    }
    if (!$esValido) {
        Response::error("Usuario no autorizado");
    }

    return $data;
}
