<?php

require_once __DIR__ . "/../core/notificar.php";

class Notificaciones {
    private Connection $connection;
    private Response $response;
    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar las últimas notificaciones de todos los usuarios
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT n.id, n.usuario_id, n.titulo, n.mensaje, n.enlace, n.leido, n.fecha_creacion
                            FROM notificaciones n
                            WHERE n.estado = 1 ORDER BY n.fecha_creacion DESC LIMIT 100");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Filtrar por id
    public function findById(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare("SELECT n.id, n.usuario_id, n.titulo, n.mensaje, n.enlace, n.leido, n.fecha_creacion
                            FROM notificaciones n
                            WHERE n.estado = 1 AND n.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Notificación no encontrada", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Bandeja de un usuario; $soloNoLeidas = true para el contador de la campana
    public function findByUsuario(int $usuario_id, bool $soloNoLeidas = false){
        if ($usuario_id <= 0) {
            $this->response->error("El ID de usuario es invalido", -1, 400);
        }
        try {
            $query = "SELECT n.id, n.usuario_id, n.titulo, n.mensaje, n.enlace, n.leido, n.fecha_creacion
                            FROM notificaciones n
                            WHERE n.estado = 1 AND n.usuario_id = ?";
            if ($soloNoLeidas) {
                $query .= " AND n.leido = 0";
            }
            $query .= " ORDER BY n.fecha_creacion DESC";

            $stmt = $this->connection->prepare($query);
            $stmt->execute([$usuario_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Crear notificación (nace como no leída)
    public function add(array $arrayData) {
        $usuario_id = (int)($arrayData["usuario_id"] ?? 0);
        $data = $this->validate($arrayData);

        if ($usuario_id <= 0) {
            $this->response->error("El usuario es obligatorio", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT id FROM usuarios WHERE id = ? AND estado = 1");
            $stmt->execute([$usuario_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario no existe", -1, 404);
            }

            crearNotificacion($this->connection, $usuario_id, $data['titulo'], $data['mensaje'], $arrayData['enlace'] ?? null);

            $this->response->success("Notificación creada con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Aviso masivo (solo admin): una notificación para todos los usuarios activos
     * o solo para los que tienen un rol. $rol_id = 0 -> todos.
     * Devuelve cuántos usuarios la recibieron.
     */
    public function addMasivo(array $arrayData, int $rol_id){
        $data = $this->validate($arrayData);
        $enlace = enlaceValido($arrayData['enlace'] ?? null);

        try {
            $query = "INSERT INTO notificaciones (usuario_id, titulo, mensaje, enlace)
                      SELECT u.id, ?, ?, ? FROM usuarios u
                      WHERE u.estado = 1 AND u.estado_cuenta = 'activo'";
            $params = [$data['titulo'], $data['mensaje'], $enlace];
            if ($rol_id > 0) {
                $query .= " AND EXISTS (SELECT 1 FROM asignaciones_roles ar
                                         WHERE ar.id_usuario = u.id AND ar.estado = 1 AND ar.id_rol = ?)";
                $params[] = $rol_id;
            }
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);

            $enviadas = $stmt->rowCount();
            if ($enviadas === 0) {
                $this->response->error("No hay usuarios activos con ese destino", -1, 404);
            }
            $this->response->success(['enviadas' => $enviadas], "Aviso enviado a {$enviadas} usuarios");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Actualizar título, mensaje y leído (el destinatario no se cambia)
    public function update(array $arrayData){
        $id    = (int)($arrayData["id"] ?? 0);
        $leido = (int)($arrayData["leido"] ?? 0) === 1 ? 1 : 0;

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE notificaciones SET titulo = ?, mensaje = ?, leido = ? WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['titulo'], $data['mensaje'], $leido, $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Notificación no encontrada o sin cambios", -1, 404);
            }

            $this->response->success("Notificación actualizada correctamente");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Marcar una notificación como leída / no leída sin tocar título ni mensaje
    public function markRead(int $id, int $leido){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("UPDATE notificaciones SET leido = ? WHERE id = ? AND estado = 1");
            $stmt->execute([$leido === 1 ? 1 : 0, $id]);
            $this->response->success("Notificación actualizada");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Marcar como leídas todas las de un usuario
    public function markAllRead(int $usuario_id){
        if ($usuario_id <= 0) {
            $this->response->error("El ID de usuario es invalido", -1, 400);
        }

        try {
            $query = "UPDATE notificaciones SET leido = 1 WHERE usuario_id = ? AND leido = 0 AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$usuario_id]);

            $this->response->success("Notificaciones marcadas como leídas");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Eliminar notificación (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE notificaciones SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.", -1, 404);
            }

            $this->response->success("Notificación eliminada con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $titulo  = trim($arrayData["titulo"] ?? '');
        $mensaje = trim($arrayData["mensaje"] ?? '');

        if (mb_strlen($titulo) < 2 || mb_strlen($titulo) > 150) {
            $this->response->error("El título debe tener entre 2 y 150 caracteres", -1, 400);
        }

        if (mb_strlen($mensaje) < 2) {
            $this->response->error("El mensaje debe tener al menos 2 caracteres", -1, 400);
        }

        return [
            'titulo'  => $titulo,
            'mensaje' => $mensaje,
        ];
    }
}
