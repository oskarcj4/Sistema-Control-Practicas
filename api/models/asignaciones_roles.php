<?php

class AsignacionesRoles {
    private Connection $connection;
    private Response $response;

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las asignaciones
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT ar.id_usuario, u.username, CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                                   ar.id_rol, r.nombre AS rol
                            FROM asignaciones_roles ar
                            INNER JOIN usuarios u ON u.id = ar.id_usuario
                            INNER JOIN roles r ON r.id = ar.id_rol
                            WHERE ar.estado = 1 ORDER BY u.apellido, u.nombre, r.nombre");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Roles de un usuario
    public function findByUsuario(int $id_usuario){
        if ($id_usuario <= 0) {
            $this->response->error("El ID de usuario es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare("SELECT ar.id_usuario, u.username, CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                                   ar.id_rol, r.nombre AS rol
                            FROM asignaciones_roles ar
                            INNER JOIN usuarios u ON u.id = ar.id_usuario
                            INNER JOIN roles r ON r.id = ar.id_rol
                            WHERE ar.estado = 1 AND ar.id_usuario = ? ORDER BY r.nombre");
            $stmt->execute([$id_usuario]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Asignar rol a usuario (si estaba quitado, se reactiva)
    public function add(array $arrayData) {
        $id_usuario = (int)($arrayData["id_usuario"] ?? 0);
        $id_rol     = (int)($arrayData["id_rol"] ?? 0);

        if ($id_usuario <= 0 || $id_rol <= 0) {
            $this->response->error("El usuario y el rol son obligatorios", -1, 400);
        }

        try {
            $query = "INSERT INTO asignaciones_roles (id_usuario, id_rol) VALUES (?, ?)
                      ON DUPLICATE KEY UPDATE estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id_usuario, $id_rol]);

            # 0 filas: ya existía activa
            if ($stmt->rowCount() === 0) {
                $this->response->error("El usuario ya tiene ese rol", -1, 409);
            }

            $this->response->success("Rol asignado con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1452) {
                $this->response->error("El usuario o el rol no existen", -1, 404);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Quitar rol a usuario (borrado lógico)
    public function delete(int $id_usuario, int $id_rol){
        if ($id_usuario <= 0 || $id_rol <= 0) {
            $this->response->error("El usuario y el rol son obligatorios", -1, 400);
        }

        try {
            # Los roles solo viven aquí: un usuario sin roles no podría usar el sistema
            $stmt = $this->connection->prepare("SELECT COUNT(*) FROM asignaciones_roles WHERE id_usuario = ? AND estado = 1");
            $stmt->execute([$id_usuario]);
            if ((int)$stmt->fetchColumn() <= 1) {
                $this->response->error("No se puede quitar el único rol del usuario", -1, 409);
            }

            $query = "UPDATE asignaciones_roles SET estado = 0 WHERE id_usuario = ? AND id_rol = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id_usuario, $id_rol]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro la asignación", -1, 404);
            }

            $this->response->success("Rol quitado con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }
}
