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

    # Vista de permisos: datos básicos + de dónde sale el permiso + ofertas activas
    private const SELECT_USUARIO_PERMISOS = "SELECT u.id, u.username, u.nombre, u.apellido, u.email,
                                   i.nombre AS institucion, u.autorizado_publicar,
                                   EXISTS (SELECT 1 FROM asignaciones_roles ar
                                            WHERE ar.id_usuario = u.id AND ar.estado = 1 AND ar.id_rol = 3) AS es_reclutador,
                                   (SELECT COUNT(*) FROM oportunidades o
                                     WHERE o.creado_por = u.id AND o.estado = 1 AND o.estado_oportunidad = 'activa') AS ofertas_activas,
                                   u.estado_cuenta
                            FROM usuarios u
                            LEFT JOIN instituciones i ON i.id = u.institucion_id";

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
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1 AND u.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Usuario no encontrado", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Filtrar por email
    public function findByEmail(string $email){
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->response->error("El email no es correcto", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare(self::SELECT_USUARIO . "
                            WHERE u.estado = 1 AND u.email = ?");
            $stmt->execute([$email]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Usuario no encontrado", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Filtrar por rol (usuarios que tienen ese rol activo en asignaciones_roles)
    public function findByRol(int $rol_id){
        if ($rol_id <= 0) {
            $this->response->error("El ID de rol es invalido", -1, 400);
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
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Columnas públicas para la lupa cuando quien busca no es admin:
    # sin email, teléfono, carnet ni datos de cuenta.
    private const SELECT_USUARIO_PUBLICO = "SELECT u.id, u.username, u.nombre, u.apellido,
                                   (SELECT GROUP_CONCAT(ar.id_rol ORDER BY ar.id_rol)
                                      FROM asignaciones_roles ar
                                     WHERE ar.id_usuario = u.id AND ar.estado = 1) AS roles,
                                   (SELECT GROUP_CONCAT(r.nombre ORDER BY r.id SEPARATOR ', ')
                                      FROM asignaciones_roles ar
                                      INNER JOIN roles r ON r.id = ar.id_rol
                                     WHERE ar.id_usuario = u.id AND ar.estado = 1) AS rol,
                                   u.institucion_id, i.nombre AS institucion,
                                   u.carrera_id, c.nombre AS carrera,
                                   u.biografia
                            FROM usuarios u
                            LEFT JOIN instituciones i ON i.id = u.institucion_id
                            LEFT JOIN carreras c ON c.id = u.carrera_id";

    # Búsqueda de usuarios por nombre, apellido o username (email solo para admin).
    # $completo = true devuelve todas las columnas (admin); false, solo las públicas.
    public function search(string $termino, bool $completo = false){
        $termino = trim($termino);
        if ($termino === '') {
            $this->response->success([]);
            return;
        }
        try {
            $like   = '%' . $termino . '%';
            $select = $completo ? self::SELECT_USUARIO : self::SELECT_USUARIO_PUBLICO;
            # Un no-admin no puede buscar por email (evita enumerar correos)
            $porEmail = $completo ? " OR u.email LIKE ?" : "";
            $params   = $completo ? [$like, $like, $like, $like] : [$like, $like, $like];
            $stmt = $this->connection->prepare($select . "
                            WHERE u.estado = 1 AND u.estado_cuenta = 'activo' AND (
                                u.nombre LIKE ? OR u.apellido LIKE ? OR u.username LIKE ?$porEmail
                            )
                            ORDER BY u.nombre, u.apellido LIMIT 15");
            $stmt->execute($params);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Crear usuario (registro público): siempre entra como estudiante.
    # Otros roles los asigna un administrador desde asignaciones_roles.
    public function add(array $arrayData) {
        $data = $this->validate($arrayData);
        $password = $arrayData["password"] ?? '';

        if (strlen($password) < 8) {
            $this->response->error("La contraseña debe contener al menos 8 caracteres", -1, 400);
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
                $this->response->error("El username o el email ya están registrados", -1, 409);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Actualizar usuario (la contraseña y los roles no se cambian aquí)
    public function update(array $arrayData){
        $id            = (int)($arrayData["id"] ?? 0);
        $estado_cuenta = trim($arrayData["estado_cuenta"] ?? 'activo');

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        if (!in_array($estado_cuenta, self::ESTADOS_CUENTA, true)) {
            $this->response->error("El estado de la cuenta no es valido", -1, 400);
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
                $this->response->error("Usuario no encontrado o sin cambios", -1, 404);
            }

            $this->response->success("Usuario actualizado correctamente");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("El username o el email ya están registrados", -1, 409);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Usuarios que hoy pueden publicar ofertas sin ser administradores:
     * los autorizados por solicitud (autorizado_publicar = 1) y los que tienen rol reclutador.
     * Incluye cuántas ofertas activas tiene cada uno.
     */
    public function findPublicadores(){
        try {
            $stmt = $this->connection->prepare(self::SELECT_USUARIO_PERMISOS . "
                            WHERE u.estado = 1
                              AND NOT EXISTS (SELECT 1 FROM asignaciones_roles ar
                                               WHERE ar.id_usuario = u.id AND ar.estado = 1 AND ar.id_rol = 2)
                              AND (u.autorizado_publicar = 1
                                   OR EXISTS (SELECT 1 FROM asignaciones_roles ar
                                               WHERE ar.id_usuario = u.id AND ar.estado = 1 AND ar.id_rol = 3))
                            ORDER BY u.apellido, u.nombre");
            $stmt->execute();
            $this->response->success($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Da o quita el permiso de publicar ofertas (solo admin).
     *
     * Al revocar ($autorizar = false):
     *   - autorizado_publicar = 0
     *   - $quitarReclutador: desactiva también el rol reclutador (si no, seguiría publicando)
     *   - $cerrarOfertas: pasa sus ofertas activas a "cancelada" (abuso)
     * En ambos casos se notifica al usuario con el motivo. Todo va en una transacción.
     */
    public function cambiarPermisoPublicar(int $id, bool $autorizar, string $motivo, bool $quitarReclutador, bool $cerrarOfertas){
        $motivo = trim($motivo);

        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }
        if (!$autorizar && mb_strlen($motivo) < 5) {
            $this->response->error("Indica el motivo de la revocación (mínimo 5 caracteres)", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT u.id,
                                                       EXISTS (SELECT 1 FROM asignaciones_roles ar
                                                                WHERE ar.id_usuario = u.id AND ar.estado = 1 AND ar.id_rol = 2) AS es_admin
                                                FROM usuarios u WHERE u.id = ? AND u.estado = 1");
            $stmt->execute([$id]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$usuario) {
                $this->response->error("Usuario no encontrado", -1, 404);
            }
            if ((int)$usuario['es_admin'] === 1) {
                $this->response->error("Los administradores siempre pueden publicar; quita primero el rol de administrador", -1, 409);
            }

            $this->connection->beginTransaction();

            $stmt = $this->connection->prepare("UPDATE usuarios SET autorizado_publicar = ? WHERE id = ?");
            $stmt->execute([$autorizar ? 1 : 0, $id]);

            $ofertasCanceladas = 0;
            if (!$autorizar) {
                if ($quitarReclutador) {
                    $stmt = $this->connection->prepare("UPDATE asignaciones_roles SET estado = 0 WHERE id_usuario = ? AND id_rol = 3 AND estado = 1");
                    $stmt->execute([$id]);
                }
                if ($cerrarOfertas) {
                    $stmt = $this->connection->prepare("UPDATE oportunidades SET estado_oportunidad = 'cancelada'
                                                        WHERE creado_por = ? AND estado = 1 AND estado_oportunidad = 'activa'");
                    $stmt->execute([$id]);
                    $ofertasCanceladas = $stmt->rowCount();
                }
            }

            if ($autorizar) {
                $titulo  = "✅ Ya puedes publicar ofertas";
                $mensaje = "Un administrador te autorizó para publicar ofertas de prácticas.";
            } else {
                $titulo  = "Permiso de publicación revocado";
                $mensaje = "Un administrador revocó tu permiso para publicar ofertas.";
                if ($ofertasCanceladas > 0) {
                    $mensaje .= " Tus ofertas activas ({$ofertasCanceladas}) fueron canceladas.";
                }
            }
            if ($motivo !== '') {
                $mensaje .= " Motivo: {$motivo}";
            }
            $stmt = $this->connection->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, ?, ?)");
            $stmt->execute([$id, $titulo, $mensaje]);

            $this->connection->commit();

            $this->response->success($autorizar
                ? "Permiso de publicación otorgado"
                : "Permiso revocado" . ($ofertasCanceladas > 0 ? ". Ofertas canceladas: {$ofertasCanceladas}" : ""));
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Eliminar usuario (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE usuarios SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.", -1, 404);
            }

            $this->response->success("Usuario eliminado con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
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
            $this->response->error("El username debe tener de 3 a 50 caracteres (letras, números, punto, guion)", -1, 400);
        }

        if (!preg_match($regexTexto, $nombre) || mb_strlen($nombre) > 100) {
            $this->response->error("El nombre solo debe contener letras y espacios", -1, 400);
        }

        if (!preg_match($regexTexto, $apellido) || mb_strlen($apellido) > 100) {
            $this->response->error("El apellido solo debe contener letras y espacios", -1, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 150) {
            $this->response->error("El email no es correcto", -1, 400);
        }

        if (mb_strlen($carnet) > 30) {
            $this->response->error("El carnet no debe superar 30 caracteres", -1, 400);
        }

        if ($telefono !== '' && !preg_match("/^[0-9+\-\s()]{7,30}$/", $telefono)) {
            $this->response->error("El teléfono no es valido", -1, 400);
        }

        if ($institucion_id > 0) {
            $stmt = $this->connection->prepare("SELECT id FROM instituciones WHERE id = ? AND estado = 1");
            $stmt->execute([$institucion_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La institución no existe", -1, 404);
            }
        }

        if ($carrera_id > 0) {
            $stmt = $this->connection->prepare("SELECT institucion_id FROM carreras WHERE id = ? AND estado = 1");
            $stmt->execute([$carrera_id]);
            $carrera = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$carrera) {
                $this->response->error("La carrera no existe", -1, 404);
            }
            if ($institucion_id > 0 && (int)$carrera['institucion_id'] !== $institucion_id) {
                $this->response->error("La carrera no pertenece a la institución indicada", -1, 400);
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
