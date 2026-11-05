<?php

class Postulaciones {
    private Connection $connection;
    private Response $response;
    private const ESTADOS_POSTULACION = ['pendiente', 'en_revision', 'aceptada', 'rechazada'];
    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las postulaciones
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT p.id, p.oportunidad_id, o.titulo AS oportunidad,
                                   p.estudiante_id, CONCAT(u.nombre, ' ', u.apellido) AS estudiante, u.email, u.carnet,
                                   p.fecha_postulacion, p.estado_postulacion, p.cv_url, p.constancia_estudios_url, p.mensaje_presentacion
                            FROM postulaciones p
                            INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                            INNER JOIN usuarios u ON u.id = p.estudiante_id
                            WHERE p.estado = 1 ORDER BY p.fecha_postulacion DESC");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por id
    public function findById(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }
        try {
            $stmt = $this->connection->prepare("SELECT p.id, p.oportunidad_id, o.titulo AS oportunidad,
                                   p.estudiante_id, CONCAT(u.nombre, ' ', u.apellido) AS estudiante, u.email, u.carnet,
                                   p.fecha_postulacion, p.estado_postulacion, p.cv_url, p.constancia_estudios_url, p.mensaje_presentacion
                            FROM postulaciones p
                            INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                            INNER JOIN usuarios u ON u.id = p.estudiante_id
                            WHERE p.estado = 1 AND p.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Postulación no encontrada");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Postulaciones de un estudiante (seguimiento)
    public function findByEstudiante(int $estudiante_id){
        if ($estudiante_id <= 0) {
            $this->response->error("El ID del estudiante es invalido");
        }
        try {
            $stmt = $this->connection->prepare("SELECT p.id, p.oportunidad_id, o.titulo AS oportunidad,
                                   p.estudiante_id, CONCAT(u.nombre, ' ', u.apellido) AS estudiante, u.email, u.carnet,
                                   p.fecha_postulacion, p.estado_postulacion, p.cv_url, p.constancia_estudios_url, p.mensaje_presentacion
                            FROM postulaciones p
                            INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                            INNER JOIN usuarios u ON u.id = p.estudiante_id
                            WHERE p.estado = 1 AND p.estudiante_id = ? ORDER BY p.fecha_postulacion DESC");
            $stmt->execute([$estudiante_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Postulantes de una oportunidad (vista del reclutador)
    public function findByOportunidad(int $oportunidad_id){
        if ($oportunidad_id <= 0) {
            $this->response->error("El ID de la oportunidad es invalido");
        }
        try {
            $stmt = $this->connection->prepare("SELECT p.id, p.oportunidad_id, o.titulo AS oportunidad,
                                   p.estudiante_id, CONCAT(u.nombre, ' ', u.apellido) AS estudiante, u.email, u.carnet,
                                   p.fecha_postulacion, p.estado_postulacion, p.cv_url, p.constancia_estudios_url, p.mensaje_presentacion
                            FROM postulaciones p
                            INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                            INNER JOIN usuarios u ON u.id = p.estudiante_id
                            WHERE p.estado = 1 AND p.oportunidad_id = ? ORDER BY p.fecha_postulacion");
            $stmt->execute([$oportunidad_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear postulación (solo estudiantes activos, oportunidad activa y vigente)
    public function add(array $arrayData) {
        $oportunidad_id = (int)($arrayData["oportunidad_id"] ?? 0);
        $estudiante_id  = (int)($arrayData["estudiante_id"] ?? 0);
        $data = $this->validate($arrayData);

        if ($oportunidad_id <= 0) {
            $this->response->error("La oportunidad es obligatoria");
        }

        if ($estudiante_id <= 0) {
            $this->response->error("El estudiante es obligatorio");
        }

        try {
            $stmt = $this->connection->prepare("SELECT u.id FROM usuarios u
                                                INNER JOIN asignaciones_roles ar ON ar.id_usuario = u.id AND ar.estado = 1
                                                INNER JOIN roles r ON r.id = ar.id_rol
                                                WHERE u.id = ? AND r.nombre = 'estudiante' AND u.estado = 1 AND u.estado_cuenta = 'activo'");
            $stmt->execute([$estudiante_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario no existe, no es estudiante o no está activo");
            }

            $stmt = $this->connection->prepare("SELECT id FROM oportunidades WHERE id = ? AND estado = 1 AND estado_oportunidad = 'activa' AND fecha_cierre >= CURDATE()");
            $stmt->execute([$oportunidad_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La oportunidad no existe o ya no recibe postulaciones");
            }

            # Si la retiró antes (estado = 0) se reactiva; la llave única oportunidad+estudiante sigue ocupada
            $stmt = $this->connection->prepare("SELECT id, estado FROM postulaciones WHERE oportunidad_id = ? AND estudiante_id = ?");
            $stmt->execute([$oportunidad_id, $estudiante_id]);
            $previa = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($previa && (int)$previa['estado'] === 1) {
                $this->response->error("El estudiante ya se postuló a esta oportunidad");
            }

            if ($previa) {
                $query = "UPDATE postulaciones SET estado = 1, estado_postulacion = 'pendiente', fecha_postulacion = NOW(),
                                 cv_url = ?, constancia_estudios_url = ?, mensaje_presentacion = ?
                          WHERE id = ?";
                $stmt = $this->connection->prepare($query);
                $stmt->execute([$data['cv_url'], $data['constancia_estudios_url'], $data['mensaje_presentacion'], (int)$previa['id']]);
                $this->response->success("Postulación registrada con éxito");
            }

            $query = "INSERT INTO postulaciones (oportunidad_id, estudiante_id, cv_url, constancia_estudios_url, mensaje_presentacion)
                      VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$oportunidad_id, $estudiante_id, $data['cv_url'], $data['constancia_estudios_url'], $data['mensaje_presentacion']]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo registrar la postulación");
            }

            $this->response->success("Postulación registrada con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("El estudiante ya se postuló a esta oportunidad");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar documentos y mensaje (solo mientras está pendiente)
    public function update(array $arrayData){
        $id = (int)($arrayData["id"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE postulaciones SET cv_url = ?, constancia_estudios_url = ?, mensaje_presentacion = ?
                      WHERE id = ? AND estado = 1 AND estado_postulacion = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['cv_url'], $data['constancia_estudios_url'], $data['mensaje_presentacion'], $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Postulación no encontrada, ya en proceso o sin cambios");
            }

            $this->response->success("Postulación actualizada correctamente");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Cambiar estado y dejar registro en historial_estado_postulacion
    public function changeState(array $arrayData){
        $id                 = (int)($arrayData["id"] ?? 0);
        $estado_postulacion = trim($arrayData["estado_postulacion"] ?? '');
        $comentario         = trim($arrayData["comentario"] ?? '');
        $actualizado_por    = (int)($arrayData["actualizado_por"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        if (!in_array($estado_postulacion, self::ESTADOS_POSTULACION, true)) {
            $this->response->error("El estado no es valido");
        }

        if ($actualizado_por <= 0) {
            $this->response->error("El usuario que actualiza es obligatorio");
        }

        try {
            $stmt = $this->connection->prepare("SELECT estado_postulacion FROM postulaciones WHERE id = ? AND estado = 1");
            $stmt->execute([$id]);
            $postulacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$postulacion) {
                $this->response->error("Postulación no encontrada");
            }

            if ($postulacion['estado_postulacion'] === $estado_postulacion) {
                $this->response->error("La postulación ya tiene ese estado");
            }

            $stmt = $this->connection->prepare("SELECT id FROM usuarios WHERE id = ? AND estado = 1 AND estado_cuenta = 'activo'");
            $stmt->execute([$actualizado_por]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario que actualiza no existe o no está activo");
            }

            $this->connection->beginTransaction();

            $stmt = $this->connection->prepare("UPDATE postulaciones SET estado_postulacion = ? WHERE id = ?");
            $stmt->execute([$estado_postulacion, $id]);

            $query = "INSERT INTO historial_estado_postulacion (postulacion_id, estado_anterior, estado_nuevo, comentario, actualizado_por)
                      VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id, $postulacion['estado_postulacion'], $estado_postulacion, $comentario !== '' ? $comentario : null, $actualizado_por]);

            $this->connection->commit();

            $this->response->success("Estado de la postulación actualizado");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar postulación (borrado lógico: el estudiante la retira mientras está pendiente)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $query = "UPDATE postulaciones SET estado = 0 WHERE id = ? AND estado = 1 AND estado_postulacion = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o la postulación ya está en proceso");
            }

            $this->response->success("Postulación eliminada con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $cv_url                  = trim($arrayData["cv_url"] ?? '');
        $constancia_estudios_url = trim($arrayData["constancia_estudios_url"] ?? '');
        $mensaje_presentacion    = trim($arrayData["mensaje_presentacion"] ?? '');

        if ($cv_url === '' || mb_strlen($cv_url) > 255) {
            $this->response->error("El CV es obligatorio y su URL no debe superar 255 caracteres");
        }

        if (!$this->isUrl($cv_url)) {
            $this->response->error("La URL del CV no es valida");
        }

        if (mb_strlen($constancia_estudios_url) > 255) {
            $this->response->error("La URL de la constancia no debe superar 255 caracteres");
        }

        if ($constancia_estudios_url !== '' && !$this->isUrl($constancia_estudios_url)) {
            $this->response->error("La URL de la constancia no es valida");
        }

        return [
            'cv_url'                  => $cv_url,
            'constancia_estudios_url' => $constancia_estudios_url !== '' ? $constancia_estudios_url : null,
            'mensaje_presentacion'    => $mensaje_presentacion !== '' ? $mensaje_presentacion : null,
        ];
    }

    # Solo http/https: evita guardar enlaces "javascript:" que luego se pintan en el front
    private function isUrl(string $value): bool {
        return filter_var($value, FILTER_VALIDATE_URL) !== false && preg_match('#^https?://#i', $value) === 1;
    }
}
