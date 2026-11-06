<?php

require_once __DIR__ . "/../core/storage.php";

class Postulaciones {
    private Connection $connection;
    private Response $response;
    private const ESTADOS_POSTULACION = ['pendiente', 'en_revision', 'aceptada', 'rechazada'];

    /**
     * Campos de texto/número del formulario de postulación.
     *
     * La llave es el nombre del campo en el formulario Y el nombre de la columna en
     * la tabla postulaciones. Para agregar un dato nuevo al formulario:
     *   1. Crear la columna en la tabla (ver database/migrations).
     *   2. Agregar una entrada aquí con sus reglas.
     * El INSERT, el UPDATE y la validación se arman solos a partir de esta lista.
     *
     * Reglas:
     *   tipo      'entero' | 'texto'
     *   requerido true si no puede quedar vacío
     *   min/max   rango (entero) o largo máximo en caracteres (texto)
     *   etiqueta  nombre que se muestra en los mensajes de error
     */
    public const CAMPOS_FORMULARIO = [
        'carrera_id'           => ['tipo' => 'entero', 'requerido' => true,  'min' => 1,  'max' => 2147483647, 'etiqueta' => 'carrera'],
        'edad'                 => ['tipo' => 'entero', 'requerido' => true,  'min' => 15, 'max' => 99,         'etiqueta' => 'edad'],
        'ciclo_universitario'  => ['tipo' => 'entero', 'requerido' => true,  'min' => 1,  'max' => 20,         'etiqueta' => 'ciclo universitario'],
        'mensaje_presentacion' => ['tipo' => 'texto',  'requerido' => false,              'max' => 3000,       'etiqueta' => 'mensaje de presentación'],
    ];

    private const SELECT_BASE = "SELECT p.id, p.oportunidad_id, o.titulo AS oportunidad,
                                   p.estudiante_id, CONCAT(u.nombre, ' ', u.apellido) AS estudiante, u.email, u.carnet,
                                   p.carrera_id, c.nombre AS carrera, p.edad, p.ciclo_universitario,
                                   p.fecha_postulacion, p.estado_postulacion, p.cv_url, p.constancia_estudios_url, p.mensaje_presentacion
                            FROM postulaciones p
                            INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                            INNER JOIN usuarios u ON u.id = p.estudiante_id
                            LEFT JOIN carreras c ON c.id = p.carrera_id
                            WHERE p.estado = 1";

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las postulaciones
    public function findAll(){
        try {
            $stmt = $this->connection->prepare(self::SELECT_BASE . " ORDER BY p.fecha_postulacion DESC");
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
            $stmt = $this->connection->prepare(self::SELECT_BASE . " AND p.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Postulación no encontrada", -1, 404);
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Postulaciones de un estudiante (seguimiento)
    public function findByEstudiante(int $estudiante_id){
        if ($estudiante_id <= 0) {
            $this->response->error("El ID del estudiante es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare(self::SELECT_BASE . " AND p.estudiante_id = ? ORDER BY p.fecha_postulacion DESC");
            $stmt->execute([$estudiante_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Postulantes de una oportunidad (vista del reclutador)
    public function findByOportunidad(int $oportunidad_id){
        if ($oportunidad_id <= 0) {
            $this->response->error("El ID de la oportunidad es invalido", -1, 400);
        }
        try {
            $stmt = $this->connection->prepare(self::SELECT_BASE . " AND p.oportunidad_id = ? ORDER BY p.fecha_postulacion");
            $stmt->execute([$oportunidad_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Valida los campos de CAMPOS_FORMULARIO y que la carrera exista.
     *
     * Si se pasa $actual (edición), los campos que no vengan en $input conservan
     * el valor que ya tenía la postulación.
     *
     * @return array columna => valor listo para guardar (null si es opcional y vino vacío)
     */
    public function validarFormulario(array $input, ?array $actual = null): array {
        $resultado = [];

        foreach (self::CAMPOS_FORMULARIO as $campo => $regla) {
            $raw = array_key_exists($campo, $input) ? $input[$campo] : ($actual[$campo] ?? null);
            $valor = is_scalar($raw) ? trim((string)$raw) : '';
            $etiqueta = $regla['etiqueta'];

            if ($valor === '') {
                if ($regla['requerido']) {
                    $this->response->error("El campo $etiqueta es obligatorio", -1, 400);
                }
                $resultado[$campo] = null;
                continue;
            }

            if ($regla['tipo'] === 'entero') {
                $numero = filter_var($valor, FILTER_VALIDATE_INT, [
                    'options' => ['min_range' => $regla['min'], 'max_range' => $regla['max']],
                ]);
                if ($numero === false) {
                    $rango = $regla['max'] < 2147483647 ? " entre {$regla['min']} y {$regla['max']}" : '';
                    $this->response->error("El campo $etiqueta debe ser un número entero$rango", -1, 400);
                }
                $resultado[$campo] = $numero;
            } else {
                if (mb_strlen($valor) > $regla['max']) {
                    $this->response->error("El campo $etiqueta no debe superar {$regla['max']} caracteres", -1, 400);
                }
                $resultado[$campo] = $valor;
            }
        }

        if ($resultado['carrera_id'] === null) {
            return $resultado;
        }

        try {
            $stmt = $this->connection->prepare("SELECT id FROM carreras WHERE id = ? AND estado = 1");
            $stmt->execute([$resultado['carrera_id']]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La carrera seleccionada no existe", -1, 404);
            }
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }

        return $resultado;
    }

    /**
     * Revisa que el estudiante y la oportunidad permitan una postulación nueva.
     * Se llama ANTES de subir archivos para no subir nada si la postulación no procede.
     *
     * @return array|null postulación retirada anteriormente (estado = 0) que se reactivará; null si es nueva.
     */
    public function validarAlta(int $oportunidad_id, int $estudiante_id): ?array {
        if ($oportunidad_id <= 0) {
            $this->response->error("La oportunidad es obligatoria", -1, 400);
        }

        if ($estudiante_id <= 0) {
            $this->response->error("El estudiante es obligatorio", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT u.id FROM usuarios u
                                                INNER JOIN asignaciones_roles ar ON ar.id_usuario = u.id AND ar.estado = 1
                                                INNER JOIN roles r ON r.id = ar.id_rol
                                                WHERE u.id = ? AND r.nombre = 'estudiante' AND u.estado = 1 AND u.estado_cuenta = 'activo'");
            $stmt->execute([$estudiante_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario no existe, no es estudiante o no está activo", -1, 404);
            }

            $stmt = $this->connection->prepare("SELECT id FROM oportunidades WHERE id = ? AND estado = 1 AND estado_oportunidad = 'activa' AND fecha_cierre >= CURDATE()");
            $stmt->execute([$oportunidad_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La oportunidad no existe o ya no recibe postulaciones", -1, 404);
            }

            # Si la retiró antes (estado = 0) se reactiva; la llave única oportunidad+estudiante sigue ocupada
            $stmt = $this->connection->prepare("SELECT id, estado, cv_url, constancia_estudios_url FROM postulaciones WHERE oportunidad_id = ? AND estudiante_id = ?");
            $stmt->execute([$oportunidad_id, $estudiante_id]);
            $previa = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($previa && (int)$previa['estado'] === 1) {
                $this->response->error("El estudiante ya se postuló a esta oportunidad", -1, 409);
            }

            return $previa ?: null;
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Inserta la postulación (o reactiva la retirada) con los datos del formulario
     * y las URLs de los archivos YA subidos al almacenamiento.
     */
    public function registrar(int $oportunidad_id, int $estudiante_id, ?array $previa, array $formulario, array $documentos) {
        $campos = array_merge($formulario, $this->validarDocumentos($documentos));
        $columnas = array_keys($campos);

        try {
            if ($previa) {
                $set = implode(', ', array_map(static fn($c) => "$c = ?", $columnas));
                $query = "UPDATE postulaciones SET estado = 1, estado_postulacion = 'pendiente', fecha_postulacion = NOW(), $set
                          WHERE id = ?";
                $stmt = $this->connection->prepare($query);
                $stmt->execute([...array_values($campos), (int)$previa['id']]);
                $this->response->success("Postulación registrada con éxito");
            }

            $query = "INSERT INTO postulaciones (oportunidad_id, estudiante_id, " . implode(', ', $columnas) . ")
                      VALUES (?, ?, " . implode(', ', array_fill(0, count($columnas), '?')) . ")";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$oportunidad_id, $estudiante_id, ...array_values($campos)]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo registrar la postulación", -1, 500);
            }

            $this->response->success("Postulación registrada con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("El estudiante ya se postuló a esta oportunidad", -1, 409);
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Postulación que todavía se puede editar (activa y pendiente).
     * Devuelve sus URLs y campos actuales; corta con error si no existe o ya está en proceso.
     */
    public function buscarEditable(int $id): array {
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $columnas = implode(', ', array_keys(self::CAMPOS_FORMULARIO));
            $stmt = $this->connection->prepare("SELECT id, estado_postulacion, cv_url, constancia_estudios_url, $columnas
                                                FROM postulaciones WHERE id = ? AND estado = 1");
            $stmt->execute([$id]);
            $actual = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$actual) {
                $this->response->error("Postulación no encontrada", -1, 404);
            }
            if ($actual['estado_postulacion'] !== 'pendiente') {
                $this->response->error("La postulación ya está en proceso y no se puede editar", -1, 409);
            }

            return $actual;
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Actualizar datos del formulario y documentos (solo mientras está pendiente)
    public function actualizar(int $id, array $formulario, array $documentos){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        $campos = array_merge($formulario, $this->validarDocumentos($documentos));
        $set = implode(', ', array_map(static fn($c) => "$c = ?", array_keys($campos)));

        try {
            $query = "UPDATE postulaciones SET $set
                      WHERE id = ? AND estado = 1 AND estado_postulacion = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([...array_values($campos), $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Postulación no encontrada, ya en proceso o sin cambios", -1, 404);
            }

            $this->response->success("Postulación actualizada correctamente");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
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
            $this->response->error("El ID es invalido", -1, 400);
        }

        if (!in_array($estado_postulacion, self::ESTADOS_POSTULACION, true)) {
            $this->response->error("El estado no es valido", -1, 400);
        }

        if ($actualizado_por <= 0) {
            $this->response->error("El usuario que actualiza es obligatorio", -1, 400);
        }

        try {
            $stmt = $this->connection->prepare("SELECT p.estado_postulacion, p.estudiante_id, o.titulo
                                                FROM postulaciones p
                                                INNER JOIN oportunidades o ON o.id = p.oportunidad_id
                                                WHERE p.id = ? AND p.estado = 1");
            $stmt->execute([$id]);
            $postulacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$postulacion) {
                $this->response->error("Postulación no encontrada", -1, 404);
            }

            if ($postulacion['estado_postulacion'] === $estado_postulacion) {
                $this->response->error("La postulación ya tiene ese estado", -1, 409);
            }

            $stmt = $this->connection->prepare("SELECT id FROM usuarios WHERE id = ? AND estado = 1 AND estado_cuenta = 'activo'");
            $stmt->execute([$actualizado_por]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("El usuario que actualiza no existe o no está activo", -1, 404);
            }

            $this->connection->beginTransaction();

            $stmt = $this->connection->prepare("UPDATE postulaciones SET estado_postulacion = ? WHERE id = ?");
            $stmt->execute([$estado_postulacion, $id]);

            $query = "INSERT INTO historial_estado_postulacion (postulacion_id, estado_anterior, estado_nuevo, comentario, actualizado_por)
                      VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id, $postulacion['estado_postulacion'], $estado_postulacion, $comentario !== '' ? $comentario : null, $actualizado_por]);

            # Notificación al estudiante (antes la mandaba el frontend con POST notificaciones.php)
            $titulo = $estado_postulacion === 'aceptada' ? "🎉 ¡Postulación Aceptada!" : "Actualización de tu postulación";
            $mensaje = $comentario !== ''
                ? $comentario
                : "Tu postulación para \"{$postulacion['titulo']}\" cambió a: {$estado_postulacion}.";
            $stmt = $this->connection->prepare("INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, ?, ?)");
            $stmt->execute([(int)$postulacion['estudiante_id'], $titulo, $mensaje]);

            $this->connection->commit();

            $this->response->success("Estado de la postulación actualizado");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Eliminar postulación (borrado lógico: el estudiante la retira mientras está pendiente)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido", -1, 400);
        }

        try {
            $query = "UPDATE postulaciones SET estado = 0 WHERE id = ? AND estado = 1 AND estado_postulacion = 'pendiente'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o la postulación ya está en proceso", -1, 404);
            }

            $this->response->success("Postulación eliminada con éxito");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    /**
     * Última barrera antes de la base de datos: las URLs de documentos solo pueden
     * apuntar al almacenamiento del sistema (carpeta local o S3, según el .env) y el
     * archivo debe existir. Ver Storage::esUrlPermitida().
     */
    private function validarDocumentos(array $documentos): array {
        $cv_url                  = trim((string)($documentos['cv_url'] ?? ''));
        $constancia_estudios_url = trim((string)($documentos['constancia_estudios_url'] ?? ''));

        if ($cv_url === '') {
            $this->response->error("El CV es obligatorio", -1, 400);
        }

        if (!Storage::esUrlPermitida($cv_url)) {
            $this->response->error("El enlace del CV no pertenece al almacenamiento del sistema", -1, 400);
        }

        if ($constancia_estudios_url !== '' && !Storage::esUrlPermitida($constancia_estudios_url)) {
            $this->response->error("El enlace de la constancia no pertenece al almacenamiento del sistema", -1, 400);
        }

        return [
            'cv_url'                  => $cv_url,
            'constancia_estudios_url' => $constancia_estudios_url !== '' ? $constancia_estudios_url : null,
        ];
    }
}
