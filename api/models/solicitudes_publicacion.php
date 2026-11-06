<?php

class SolicitudesPublicacion {
    private Connection $connection;
    private Response $response;

    private const ESTADOS_SOLICITUD = ['pendiente', 'aprobada', 'rechazada'];

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las solicitudes
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT s.id, s.usuario_id, CONCAT(u.nombre, ' ', u.apellido) AS usuario, u.email,
                                   s.nombre_organizacion_proyecto, s.descripcion_actividades, s.documento_respaldo_url,
                                   s.estado_solicitud, s.comentario_admin,
                                   s.revisado_por, CONCAT(a.nombre, ' ', a.apellido) AS revisado_por_nombre,
                                   s.fecha_solicitud, s.fecha_revision
                            FROM solicitudes_publicacion s
                            INNER JOIN usuarios u ON u.id = s.usuario_id
                            LEFT JOIN usuarios a ON a.id = s.revisado_por
                            WHERE s.estado = 1 ORDER BY s.fecha_solicitud DESC");
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
            $stmt = $this->connection->prepare("SELECT s.id, s.usuario_id, CONCAT(u.nombre, ' ', u.apellido) AS usuario, u.email,
                                   s.nombre_organizacion_proyecto, s.descripcion_actividades, s.documento_respaldo_url,
                                   s.estado_solicitud, s.comentario_admin,
                                   s.revisado_por, CONCAT(a.nombre, ' ', a.apellido) AS revisado_por_nombre,
                                   s.fecha_solicitud, s.fecha_revision
                            FROM solicitudes_publicacion s
                            INNER JOIN usuarios u ON u.id = s.usuario_id
                            LEFT JOIN usuarios a ON a.id = s.revisado_por
                            WHERE s.estado = 1 AND s.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Solicitud no encontrada", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Filtrar por estado (cola de revisión del admin)
    public function findByEstado(string $estado_solicitud){
        if (!in_array($estado_solicitud, self::ESTADOS_SOLICITUD, true)) {
            $this->response->error("El estado no es valido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare("SELECT s.id, s.usuario_id, CONCAT(u.nombre, ' ', u.apellido) AS usuario, u.email,
                                   s.nombre_organizacion_proyecto, s.descripcion_actividades, s.documento_respaldo_url,
                                   s.estado_solicitud, s.comentario_admin,
                                   s.revisado_por, CONCAT(a.nombre, ' ', a.apellido) AS revisado_por_nombre,
                                   s.fecha_solicitud, s.fecha_revision
                            FROM solicitudes_publicacion s
                            INNER JOIN usuarios u ON u.id = s.usuario_id
                            LEFT JOIN usuarios a ON a.id = s.revisado_por
                            WHERE s.estado = 1 AND s.estado_solicitud = ? ORDER BY s.fecha_solicitud");
            $stmt->execute([$estado_solicitud]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Filtrar por usuario solicitante
    public function findByUsuario(int $usuario_id){
        if ($usuario_id <= 0) {
            $this->response->error("El ID de usuario es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare("SELECT s.id, s.usuario_id, CONCAT(u.nombre, ' ', u.apellido) AS usuario, u.email,
                                   s.nombre_organizacion_proyecto, s.descripcion_actividades, s.documento_respaldo_url,
                                   s.estado_solicitud, s.comentario_admin,
                                   s.revisado_por, CONCAT(a.nombre, ' ', a.apellido) AS revisado_por_nombre,
                                   s.fecha_solicitud, s.fecha_revision
                            FROM solicitudes_publicacion s
                            INNER JOIN usuarios u ON u.id = s.usuario_id
                            LEFT JOIN usuarios a ON a.id = s.revisado_por
                            WHERE s.estado = 1 AND s.usuario_id = ? ORDER BY s.fecha_solicitud DESC");
            $stmt->execute([$usuario_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Crear solicitud (un usuario solo puede tener una pendiente)
    public function add(array $arrayData) {
        $usuario_id = (int)($arrayData["usuario_id"] ?? 0);
        $data = $this->validate($arrayData);

        if ($usuario_id <= 0) {
            $this->response->error("El usuario es obligatorio", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT nombre, apellido, username, autorizado_publicar FROM usuarios WHERE id = ? AND estado = 1 AND estado_cuenta = 'activo'");
            $stmt->execute([$usuario_id]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$usuario) {
                $this->response->error("El usuario no existe o no está activo", -1, 404);
            }

            if ((int)$usuario['autorizado_publicar'] === 1) {
                $this->response->error("El usuario ya está autorizado para publicar", -1, 409);
            }

            $stmt = $this->connection->prepare("SELECT id FROM solicitudes_publicacion WHERE usuario_id = ? AND estado = 1 AND estado_solicitud = 'pendiente'");
            $stmt->execute([$usuario_id]);
            if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario ya tiene una solicitud pendiente", -1, 409);
            }

            $query = "INSERT INTO solicitudes_publicacion (usuario_id, nombre_organizacion_proyecto, descripcion_actividades, documento_respaldo_url)
                      VALUES (?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$usuario_id, $data['nombre_organizacion_proyecto'], $data['descripcion_actividades'], $data['documento_respaldo_url']]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo registrar la solicitud", -1, 500);
            }

            # Notificar a los administradores activos del sistema
            try {
                $stmtAdmin = $this->connection->prepare("SELECT ar.id_usuario FROM asignaciones_roles ar
                                                         INNER JOIN roles r ON r.id = ar.id_rol
                                                         WHERE r.nombre = 'administrador' AND ar.estado = 1");
                $stmtAdmin->execute();
                $admins = $stmtAdmin->fetchAll(PDO::FETCH_ASSOC);

                $nombreSolicitante = trim(($usuario['nombre'] ?? '') . ' ' . ($usuario['apellido'] ?? ''));
                if ($nombreSolicitante === '') {
                    $nombreSolicitante = $usuario['username'] ?? 'Un usuario';
                }

                $stmtNotif = $this->connection->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, ?, ?)");
                foreach ($admins as $admin) {
                    $stmtNotif->execute([
                        (int)$admin['id_usuario'],
                        "Nueva solicitud de publicación",
                        "{$nombreSolicitante} ha enviado una solicitud para publicar prácticas en '{$data['nombre_organizacion_proyecto']}'."
                    ]);
                }
            } catch (\Throwable $th) {
                // Notificación a administradores es accesoria, no bloquea la respuesta
            }

            $this->response->success("Solicitud registrada con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Actualizar solicitud (solo mientras está pendiente)
    public function update(array $arrayData){
        $id = (int)($arrayData["id"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE solicitudes_publicacion
                      SET nombre_organizacion_proyecto = ?, descripcion_actividades = ?, documento_respaldo_url = ?
                      WHERE id = ? AND estado = 1 AND estado_solicitud = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['nombre_organizacion_proyecto'], $data['descripcion_actividades'], $data['documento_respaldo_url'], $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Solicitud no encontrada, ya revisada o sin cambios", -1, 404);
            }

            $this->response->success("Solicitud actualizada correctamente");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Aprobar o rechazar solicitud. Si se aprueba, el usuario queda autorizado a publicar.
    public function review(array $arrayData){
        $id               = (int)($arrayData["id"] ?? 0);
        $estado_solicitud = trim($arrayData["estado_solicitud"] ?? '');
        $comentario_admin = trim($arrayData["comentario_admin"] ?? '');
        $revisado_por     = (int)($arrayData["revisado_por"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        if (!in_array($estado_solicitud, ['aprobada', 'rechazada'], true)) {
            $this->response->error("El estado debe ser 'aprobada' o 'rechazada'", -1, 400);
        }

        if ($estado_solicitud === 'rechazada' && $comentario_admin === '') {
            $this->response->error("Debe indicar el motivo del rechazo", -1, 400);
        }

        if ($revisado_por <= 0) {
            $this->response->error("El revisor es obligatorio", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT u.id FROM usuarios u
                                                INNER JOIN asignaciones_roles ar ON ar.id_usuario = u.id AND ar.estado = 1
                                                INNER JOIN roles r ON r.id = ar.id_rol
                                                WHERE u.id = ? AND r.nombre = 'administrador' AND u.estado = 1 AND u.estado_cuenta = 'activo'");
            $stmt->execute([$revisado_por]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("Solo un administrador puede revisar solicitudes", -1, 403);
            }

            $stmt = $this->connection->prepare("SELECT usuario_id FROM solicitudes_publicacion WHERE id = ? AND estado = 1 AND estado_solicitud = 'pendiente'");
            $stmt->execute([$id]);
            $solicitud = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$solicitud) {
                $this->response->error("Solicitud no encontrada o ya revisada", -1, 404);
            }

            $this->connection->beginTransaction();

            $query = "UPDATE solicitudes_publicacion
                      SET estado_solicitud = ?, comentario_admin = ?, revisado_por = ?, fecha_revision = NOW()
                      WHERE id = ? AND estado = 1 AND estado_solicitud = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$estado_solicitud, $comentario_admin !== '' ? $comentario_admin : null, $revisado_por, $id]);

            if ($estado_solicitud === 'aprobada') {
                $stmt = $this->connection->prepare("UPDATE usuarios SET autorizado_publicar = 1 WHERE id = ?");
                $stmt->execute([(int)$solicitud['usuario_id']]);
            }

            $this->connection->commit();

            $this->response->success($estado_solicitud === 'aprobada' ? "Solicitud aprobada, usuario autorizado a publicar" : "Solicitud rechazada");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Eliminar solicitud (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE solicitudes_publicacion SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.", -1, 404);
            }

            $this->response->success("Solicitud eliminada con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $nombre_organizacion_proyecto = trim($arrayData["nombre_organizacion_proyecto"] ?? '');
        $descripcion_actividades      = trim($arrayData["descripcion_actividades"] ?? '');
        $documento_respaldo_url       = trim($arrayData["documento_respaldo_url"] ?? '');

        if ($nombre_organizacion_proyecto === '' || mb_strlen($nombre_organizacion_proyecto) > 150) {
            $this->response->error("El nombre de la organización o proyecto es obligatorio y no debe superar 150 caracteres", -1, 400);
        }

        if ($descripcion_actividades === '') {
            $this->response->error("La descripción de actividades es obligatoria", -1, 400);
        }

        if (mb_strlen($documento_respaldo_url) > 255) {
            $this->response->error("La URL del documento no debe superar 255 caracteres", -1, 400);
        }

        # Solo http/https: evita guardar enlaces "javascript:" que luego se pintan en el front
        if ($documento_respaldo_url !== '' && (!filter_var($documento_respaldo_url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $documento_respaldo_url))) {
            $this->response->error("La URL del documento no es valida", -1, 400);
        }

        return [
            'nombre_organizacion_proyecto' => $nombre_organizacion_proyecto,
            'descripcion_actividades'      => $descripcion_actividades,
            'documento_respaldo_url'       => $documento_respaldo_url !== '' ? $documento_respaldo_url : null,
        ];
    }
}
