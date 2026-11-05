<?php

class Roles {
    private Connection $connection;
    private Response $response;

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todos los roles
    public function findAll(){
        try {
            $query = "SELECT id, nombre, descripcion, creado_en FROM roles ORDER BY id";
            $stmt = $this->connection->prepare($query);
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
            $query = "SELECT id, nombre, descripcion, creado_en FROM roles WHERE id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Rol no encontrado");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear rol
    public function add(array $arrayData) {
        $nombre = trim($arrayData["nombre"] ?? '');
        $descripcion = trim($arrayData["descripcion"] ?? '');

        if ($nombre === '' || mb_strlen($nombre) > 50) {
            $this->response->error("El nombre es obligatorio y no debe superar 50 caracteres");
        }

        if (mb_strlen($descripcion) > 255) {
            $this->response->error("La descripción no debe superar 255 caracteres");
        }

        try {
            $query = "INSERT INTO roles (nombre, descripcion) VALUES (?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$nombre, $descripcion !== '' ? $descripcion : null]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo agregar el rol");
            }

            $this->response->success("Rol registrado con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("Ya existe un rol con ese nombre");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar rol
    public function update(array $arrayData){
        $id          = (int)($arrayData["id"] ?? 0);
        $nombre      = trim($arrayData["nombre"] ?? '');
        $descripcion = trim($arrayData["descripcion"] ?? '');

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        if ($nombre === '' || mb_strlen($nombre) > 50) {
            $this->response->error("El nombre es obligatorio y no debe superar 50 caracteres");
        }

        if (mb_strlen($descripcion) > 255) {
            $this->response->error("La descripción no debe superar 255 caracteres");
        }

        try {
            $query = "UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$nombre, $descripcion !== '' ? $descripcion : null, $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Rol no encontrado o sin cambios");
            }

            $this->response->success("Rol actualizado correctamente");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("Ya existe un rol con ese nombre");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar rol (falla si hay usuarios activos con este rol)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $query = "SELECT COUNT(*) FROM asignaciones_roles ar
                      INNER JOIN usuarios u ON u.id = ar.id_usuario
                      WHERE ar.id_rol = ? AND ar.estado = 1 AND u.estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ((int)$stmt->fetchColumn() > 0) {
                $this->response->error("No se puede eliminar: hay usuarios con este rol");
            }

            $query = "DELETE FROM roles WHERE id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID.");
            }

            $this->response->success("Rol eliminado con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }
}
