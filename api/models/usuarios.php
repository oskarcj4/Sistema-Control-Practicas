<?php

class Usuarios {
    private Connection $connection;
    private Response $response;
    private const ESTADOS_CUENTA = ['activo', 'inactivo', 'suspendido'];
    private const ROL_ESTUDIANTE = 1; # el registro público siempre crea estudiantes

    # Columnas comunes. Los roles salen de asignaciones_roles (usuarios no tiene rol_id):
    #   roles -> ids "1,3"            rol -> nombres "estudiante, reclutador"
    private const SELECT_USUARIO = "SELECT u.id, u.username, u.nombre, u.apellido, u.email,
                                   (SELECT GROUP_CONCAT(ar.id_rol ORDER BY ar.id_rol)
                                      FROM asignaciones_roles ar
                                     WHERE ar.id_usuario = u.id AND ar.estado = 1) AS roles,
                                   (SELECT GROUP_CONCAT(r.nombre ORDER BY r.id SEPARATOR ', ')
                                      FROM asignaciones_roles ar
                                      INNER JOIN roles r ON r.id = ar.id_rol
                                     WHERE ar.id_usuario = u.id AND ar.estado = 1) AS rol,
                                   u.institucion_id, i.nombre AS institucion,
                                   u.carrera_id, c.nombre AS carrera,
                                   u.carnet, u.telefono, u.biografia,
                                   u.autorizado_publicar, u.estado_cuenta, u.fecha_registro
                            FROM usuarios u
                            LEFT JOIN instituciones i ON i.id = u.institucion_id
                            LEFT JOIN carreras c ON c.id = u.carrera_id";

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todos los usuarios no eliminados (incluye suspendidos para que el admin los vea)
    public function findAll(){
        try {
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1 ORDER BY u.apellido, u.nombre");
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
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1 AND u.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Usuario no encontrado");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por email
    public function findByEmail(string $email){
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->response->error("El email no es correcto");
        }
        try {
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1 AND u.email = ?");
            $stmt->execute([$email]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Usuario no encontrado");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por rol (usuarios que tienen ese rol activo en asignaciones_roles)
    public function findByRol(int $rol_id){
        if ($rol_id <= 0) {
            $this->response->error("El ID de rol es invalido");
        }
        try {
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1
                              AND EXISTS (SELECT 1 FROM asignaciones_roles ar
                                           WHERE ar.id_usuario = u.id AND ar.id_rol = ? AND ar.estado = 1)
                            ORDER BY u.apellido, u.nombre");
            $stmt->execute([$rol_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear usuario (registro público): siempre entra como estudiante.
    # Otros roles los asigna un administrador desde asignaciones_roles.
    public function add(array $arrayData) {
        $data = $this->validate($arrayData);
        $password = $arrayData["password"] ?? '';

        if (strlen($password) < 8) {
            $this->response->error("La contraseña debe contener al menos 8 caracteres");
        }

        $cifrada = password_hash($password, PASSWORD_DEFAULT);

        try {
            # Usuario y rol se guardan juntos: si falla uno, no queda ninguno
            $this->connection->beginTransaction();

            $query = "INSERT INTO usuarios (username, nombre, apellido, email, password_hash, institucion_id, carrera_id, carnet, telefono, biografia)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                $data['username'], $data['nombre'], $data['apellido'], $data['email'], $cifrada,
                $data['institucion_id'], $data['carrera_id'],
                $data['carnet'], $data['telefono'], $data['biografia']
            ]);

            $id_user = (int)$stmt->lastInsertId();

            $stmt = $this->connection->prepare("INSERT INTO asignaciones_roles (id_usuario, id_rol) VALUES (?, ?)");
            $stmt->execute([$id_user, self::ROL_ESTUDIANTE]);

            $this->connection->commit();
            $this->response->success("Usuario registrado con éxito");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("El username o el email ya están registrados");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar usuario (la contraseña y los roles no se cambian aquí)
    public function update(array $arrayData){
        $id            = (int)($arrayData["id"] ?? 0);
        $estado_cuenta = trim($arrayData["estado_cuenta"] ?? 'activo');

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        if (!in_array($estado_cuenta, self::ESTADOS_CUENTA, true)) {
            $this->response->error("El estado de la cuenta no es valido");
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE usuarios SET username = ?, nombre = ?, apellido = ?, email = ?, institucion_id = ?,
                             carrera_id = ?, carnet = ?, telefono = ?, biografia = ?, estado_cuenta = ?
                      WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                $data['username'], $data['nombre'], $data['apellido'], $data['email'],
                $data['institucion_id'], $data['carrera_id'],
                $data['carnet'], $data['telefono'], $data['biografia'], $estado_cuenta, $id
            ]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Usuario no encontrado o sin cambios");
            }

            $this->response->success("Usuario actualizado correctamente");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("El username o el email ya están registrados");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar usuario (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $query = "UPDATE usuarios SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.");
            }

            $this->response->success("Usuario eliminado con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $username       = trim($arrayData["username"] ?? '');
        $nombre         = trim($arrayData["nombre"] ?? '');
        $apellido       = trim($arrayData["apellido"] ?? '');
        $email          = trim($arrayData["email"] ?? '');
        $institucion_id = (int)($arrayData["institucion_id"] ?? 0);
        $carrera_id     = (int)($arrayData["carrera_id"] ?? 0);
        $carnet         = trim($arrayData["carnet"] ?? '');
        $telefono       = trim($arrayData["telefono"] ?? '');
        $biografia      = trim($arrayData["biografia"] ?? '');

        $regexTexto = "/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u";

        if (!preg_match("/^[a-zA-Z0-9._-]{3,50}$/", $username)) {
            $this->response->error("El username debe tener de 3 a 50 caracteres (letras, números, punto, guion)");
        }

        if (!preg_match($regexTexto, $nombre) || mb_strlen($nombre) > 100) {
            $this->response->error("El nombre solo debe contener letras y espacios");
        }

        if (!preg_match($regexTexto, $apellido) || mb_strlen($apellido) > 100) {
            $this->response->error("El apellido solo debe contener letras y espacios");
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
            $this->response->error("El email no es correcto");
        }

        if (mb_strlen($carnet) > 30) {
            $this->response->error("El carnet no debe superar 30 caracteres");
        }

        if ($telefono !== '' && !preg_match("/^[0-9+\-\s()]{7,30}$/", $telefono)) {
            $this->response->error("El teléfono no es valido");
        }

        if ($institucion_id > 0) {
            $stmt = $this->connection->prepare("SELECT id FROM instituciones WHERE id = ? AND estado = 1");
            $stmt->execute([$institucion_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La institución no existe");
            }
        }

        if ($carrera_id > 0) {
            $stmt = $this->connection->prepare("SELECT institucion_id FROM carreras WHERE id = ? AND estado = 1");
            $stmt->execute([$carrera_id]);
            $carrera = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$carrera) {
                $this->response->error("La carrera no existe");
            }
            if ($institucion_id > 0 && (int)$carrera['institucion_id'] !== $institucion_id) {
                $this->response->error("La carrera no pertenece a la institución indicada");
            }
        }

        return [
            'username'       => $username,
            'nombre'         => $nombre,
            'apellido'       => $apellido,
            'email'          => $email,
            'institucion_id' => $institucion_id > 0 ? $institucion_id : null,
            'carrera_id'     => $carrera_id > 0 ? $carrera_id : null,
            'carnet'         => $carnet !== '' ? $carnet : null,
            'telefono'       => $telefono !== '' ? $telefono : null,
            'biografia'      => $biografia !== '' ? $biografia : null,
        ];
    }
}
