<?php

require_once __DIR__ . "/../core/notificar.php";

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

    private const ROL_ADMIN = 2;

    # Asignar rol a usuario (si estaba quitado, se reactiva). $actor = admin que hace el cambio.
    public function add(array $arrayData, int $actor = 0) {
        $id_usuario = (int)($arrayData["id_usuario"] ?? 0);
        $id_rol     = (int)($arrayData["id_rol"] ?? 0);

        if ($id_usuario <= 0 || $id_rol <= 0) {
            $this->response->error("El usuario y el rol son obligatorios", -1, 400);
        }

        try {
            # Solo usuarios activos: no tiene sentido dar roles (menos admin) a una cuenta suspendida
            $stmt = $this->connection->prepare("SELECT estado_cuenta FROM usuarios WHERE id = ? AND estado = 1");
            $stmt->execute([$id_usuario]);
            $estadoCuenta = $stmt->fetchColumn();
            if ($estadoCuenta === false) {
                $this->response->error("El usuario no existe", -1, 404);
            }
            if ($estadoCuenta !== 'activo') {
                $this->response->error("Reactiva la cuenta antes de asignarle roles", -1, 409);
            }

            $nombreRol = $this->nombreRol($id_rol);

            $this->connection->beginTransaction();

            $query = "INSERT INTO asignaciones_roles (id_usuario, id_rol) VALUES (?, ?)
                      ON DUPLICATE KEY UPDATE estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id_usuario, $id_rol]);

            # 0 filas: ya existía activa
            if ($stmt->rowCount() === 0) {
                $this->connection->rollBack();
                $this->response->error("El usuario ya tiene ese rol", -1, 409);
            }

            $this->notificar($id_usuario, "Nuevo rol asignado",
                "Un administrador te asignó el rol '{$nombreRol}'. Recarga la página para ver los cambios.");

            $this->connection->commit();
            $this->response->success("Rol asignado con éxito");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            if (($e->errorInfo[1] ?? 0) === 1452) {
                $this->response->error("El usuario o el rol no existen", -1, 404);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Quitar rol a usuario (borrado lógico). $actor = admin que hace el cambio.
    public function delete(int $id_usuario, int $id_rol, int $actor = 0){
        if ($id_usuario <= 0 || $id_rol <= 0) {
            $this->response->error("El usuario y el rol son obligatorios", -1, 400);
        }

        if ($id_rol === self::ROL_ADMIN && $id_usuario === $actor) {
            $this->response->error("No puedes quitarte tu propio rol de administrador. Pídeselo a otro administrador.", -1, 409);
        }

        try {
            # Nunca dejar el sistema sin administradores
            if ($id_rol === self::ROL_ADMIN) {
                $stmt = $this->connection->prepare("SELECT COUNT(*) FROM asignaciones_roles ar
                                                    INNER JOIN usuarios u ON u.id = ar.id_usuario
                                                    WHERE ar.id_rol = ? AND ar.estado = 1 AND u.estado = 1 AND u.estado_cuenta = 'activo'");
                $stmt->execute([self::ROL_ADMIN]);
                if ((int)$stmt->fetchColumn() <= 1) {
                    $this->response->error("No se puede quitar al último administrador activo", -1, 409);
                }
            }

            # Los roles solo viven aquí: un usuario sin roles no podría usar el sistema
            $stmt = $this->connection->prepare("SELECT COUNT(*) FROM asignaciones_roles WHERE id_usuario = ? AND estado = 1");
            $stmt->execute([$id_usuario]);
            if ((int)$stmt->fetchColumn() <= 1) {
                $this->response->error("No se puede quitar el único rol del usuario", -1, 409);
            }

            $nombreRol = $this->nombreRol($id_rol);

            $this->connection->beginTransaction();

            $query = "UPDATE asignaciones_roles SET estado = 0 WHERE id_usuario = ? AND id_rol = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id_usuario, $id_rol]);

            if ($stmt->rowCount() === 0) {
                $this->connection->rollBack();
                $this->response->error("No se encontro la asignación", -1, 404);
            }

            $this->notificar($id_usuario, "Rol retirado",
                "Un administrador te retiró el rol '{$nombreRol}'.");

            $this->connection->commit();
            $this->response->success("Rol quitado con éxito");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /** Nombre del rol; corta con 404 si no existe. */
    private function nombreRol(int $id_rol): string {
        $stmt = $this->connection->prepare("SELECT nombre FROM roles WHERE id = ?");
        $stmt->execute([$id_rol]);
        $nombre = $stmt->fetchColumn();
        if ($nombre === false) {
            $this->response->error("El rol no existe", -1, 404);
        }
        return (string)$nombre;
    }

    private function notificar(int $usuario_id, string $titulo, string $mensaje): void {
        crearNotificacion($this->connection, $usuario_id, $titulo, $mensaje);
    }
}
