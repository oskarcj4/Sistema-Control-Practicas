<?php

class HistorialEstadoPostulacion {
    private Connection $connection;
    private Response $response;
    private const ESTADOS_POSTULACION = ['pendiente', 'en_revision', 'aceptada', 'rechazada'];

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todo el historial
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT h.id, h.postulacion_id, h.estado_anterior, h.estado_nuevo, h.comentario,
                                   h.actualizado_por, CONCAT(u.nombre, ' ', u.apellido) AS actualizado_por_nombre, h.fecha
                            FROM historial_estado_postulacion h
                            INNER JOIN usuarios u ON u.id = h.actualizado_por
                            WHERE h.estado = 1 ORDER BY h.fecha DESC LIMIT 100");
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
            $stmt = $this->connection->prepare("SELECT h.id, h.postulacion_id, h.estado_anterior, h.estado_nuevo, h.comentario,
                                   h.actualizado_por, CONCAT(u.nombre, ' ', u.apellido) AS actualizado_por_nombre, h.fecha
                            FROM historial_estado_postulacion h
                            INNER JOIN usuarios u ON u.id = h.actualizado_por
                            WHERE h.estado = 1 AND h.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Registro no encontrado", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Línea de tiempo de una postulación
    public function findByPostulacion(int $postulacion_id){
        if ($postulacion_id <= 0) {
            $this->response->error("El ID de la postulación es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare("SELECT h.id, h.postulacion_id, h.estado_anterior, h.estado_nuevo, h.comentario,
                                   h.actualizado_por, CONCAT(u.nombre, ' ', u.apellido) AS actualizado_por_nombre, h.fecha
                            FROM historial_estado_postulacion h
                            INNER JOIN usuarios u ON u.id = h.actualizado_por
                            WHERE h.estado = 1 AND h.postulacion_id = ? ORDER BY h.fecha");
            $stmt->execute([$postulacion_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Crear registro manual (lo normal es que lo cree Postulaciones::changeState)
    public function add(array $arrayData) {
        $postulacion_id  = (int)($arrayData["postulacion_id"] ?? 0);
        $estado_anterior = trim($arrayData["estado_anterior"] ?? '');
        $estado_nuevo    = trim($arrayData["estado_nuevo"] ?? '');
        $comentario      = trim($arrayData["comentario"] ?? '');
        $actualizado_por = (int)($arrayData["actualizado_por"] ?? 0);

        if ($postulacion_id <= 0) {
            $this->response->error("La postulación es obligatoria", -1, 400);
        }

        if (!in_array($estado_anterior, self::ESTADOS_POSTULACION, true) || !in_array($estado_nuevo, self::ESTADOS_POSTULACION, true)) {
            $this->response->error("Los estados no son validos", -1, 400);
        }

        if ($actualizado_por <= 0) {
            $this->response->error("El usuario que actualiza es obligatorio", -1, 400);
        }

        try {
            $query = "INSERT INTO historial_estado_postulacion (postulacion_id, estado_anterior, estado_nuevo, comentario, actualizado_por)
                      VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$postulacion_id, $estado_anterior, $estado_nuevo, $comentario !== '' ? $comentario : null, $actualizado_por]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo agregar el registro", -1, 500);
            }

            $this->response->success("Registro agregado con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1452) {
                $this->response->error("La postulación o el usuario no existen", -1, 404);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Actualizar comentario (los estados no se reescriben)
    public function update(array $arrayData){
        $id         = (int)($arrayData["id"] ?? 0);
        $comentario = trim($arrayData["comentario"] ?? '');

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE historial_estado_postulacion SET comentario = ? WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$comentario !== '' ? $comentario : null, $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Registro no encontrado o sin cambios", -1, 404);
            }

            $this->response->success("Registro actualizado correctamente");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Eliminar registro (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE historial_estado_postulacion SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.", -1, 404);
            }

            $this->response->success("Registro eliminado con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }
}
