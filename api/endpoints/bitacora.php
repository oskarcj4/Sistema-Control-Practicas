<?php

require_once __DIR__ . "/../core/connection.php";
require_once __DIR__ . "/../core/auth-middleware.php";
require_once __DIR__ . "/../core/permisos.php";

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json");

$connection = Connection::load();
$method     = $_SERVER["REQUEST_METHOD"];

/*
 * Lectura de la bitácora que llena api/core/audit-log.php (solo admin).
 * GET bitacora.php?tabla=&usuario=&accion=INSERT|UPDATE|DELETE&cursor=&limit=
 *   cursor -> id del último registro recibido (0 = primera página); orden por id descendente.
 *   ?tablas=1 -> lista de tablas que aparecen en la bitácora (para el filtro).
 */
requireAuth([ROL_ADMIN]);

if ($method !== 'GET') {
    Response::invalidMethod();
}

try {
    if (isset($_GET['tablas'])) {
        $tablas = $connection->query("SELECT DISTINCT nameTable FROM bitacora ORDER BY nameTable")->fetchAll(PDO::FETCH_COLUMN);
        Response::success($tablas);
    }

    $tabla   = trim((string)($_GET['tabla'] ?? ''));
    $usuario = trim((string)($_GET['usuario'] ?? ''));
    $accion  = strtoupper(trim((string)($_GET['accion'] ?? '')));
    $cursor  = (int)($_GET['cursor'] ?? 0);
    $limit   = max(1, min(100, (int)($_GET['limit'] ?? 30)));

    if ($accion !== '' && !in_array($accion, ['INSERT', 'UPDATE', 'DELETE'], true)) {
        Response::error("La acción no es valida", -1, 400);
    }

    $query  = "SELECT id, `user` AS usuario, action AS accion, nameTable AS tabla, idRowTable AS registro_id,
                      newDate AS datos, dateEvent AS fecha
                 FROM bitacora WHERE status = 1";
    $params = [];

    if ($tabla !== '') {
        $query .= " AND nameTable = ?";
        $params[] = $tabla;
    }
    if ($usuario !== '') {
        $query .= " AND `user` LIKE ?";
        $params[] = '%' . addcslashes(mb_substr($usuario, 0, 100), "%_\\") . '%';
    }
    if ($accion !== '') {
        $query .= " AND action = ?";
        $params[] = $accion;
    }
    if ($cursor > 0) {
        $query .= " AND id < ?";
        $params[] = $cursor;
    }
    $query .= " ORDER BY id DESC LIMIT ?";

    $stmt = $connection->prepare($query);
    foreach ($params as $i => $v) {
        $stmt->bindValue($i + 1, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    $filas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($filas as &$fila) {
        # newDate es JSON en texto: se entrega ya decodificado
        $fila['datos'] = $fila['datos'] !== null ? json_decode((string)$fila['datos'], true) : null;
    }
    unset($fila);

    Response::success($filas);
} catch (\Throwable $th) {
    Response::error("Error", -1, 500);
    //Response::debugError($th);
}
