<?php

class Oportunidades {
    private Connection $connection;
    private Response $response;

    private const MODALIDADES = ['presencial', 'remoto', 'hibrido'];
    private const ESTADOS_OPORTUNIDAD = ['activa', 'cerrada', 'cancelada'];

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las oportunidades activas en el sistema (incluye cerradas y canceladas)
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT o.id, o.titulo, o.descripcion, o.requisitos,
                                   o.institucion_id, i.nombre AS institucion,
                                   o.carrera_id, c.nombre AS carrera,
                                   o.modalidad, o.ubicacion, o.fecha_publicacion, o.fecha_cierre, o.estado_oportunidad,
                                   o.creado_por, CONCAT(u.nombre, ' ', u.apellido) AS creado_por_nombre,
                                   o.creado_en, o.visto
                            FROM oportunidades o
                            INNER JOIN usuarios u ON u.id = o.creado_por
                            LEFT JOIN instituciones i ON i.id = o.institucion_id
                            LEFT JOIN carreras c ON c.id = o.carrera_id
                            WHERE o.estado = 1 ORDER BY o.fecha_publicacion DESC, o.id DESC");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Feed: oportunidades activas y vigentes, filtros opcionales por carrera y modalidad
    public function feed(int $cursor=0, int $carrera_id = 0, string $modalidad = '', $limit=20){
        if ($modalidad !== '' && !in_array($modalidad, self::MODALIDADES, true)) {
            $this->response->error("La modalidad no es valida");
        }
        // Paginacion por cursor
        // El cliente envia un puntero con el ultimo registro que visito.
        try {
            $query = "SELECT o.id, o.titulo, o.descripcion, o.requisitos,
                                   o.institucion_id, i.nombre AS institucion,
                                   o.carrera_id, c.nombre AS carrera,
                                   o.modalidad, o.ubicacion, o.fecha_publicacion, o.fecha_cierre, o.estado_oportunidad,
                                   o.creado_por, CONCAT(u.nombre, ' ', u.apellido) AS creado_por_nombre,
                                   o.creado_en, o.visto
                            FROM oportunidades o
                            INNER JOIN usuarios u ON u.id = o.creado_por
                            LEFT JOIN instituciones i ON i.id = o.institucion_id
                            LEFT JOIN carreras c ON c.id = o.carrera_id
                            WHERE o.estado = 1 AND o.estado_oportunidad = 'activa' AND o.fecha_cierre >= CURDATE()";
            $params = [];

            if ($carrera_id > 0) {
                $query .= " AND (o.carrera_id = ? OR o.carrera_id IS NULL)";
                $params[] = $carrera_id;
            }

            if ($modalidad !== '') {
                $query .= " AND o.modalidad = ?";
                $params[] = $modalidad;
            }
            if ($cursor > 0) {                     # primera pagina: sin cursor
                $query .= " AND o.id < ?";
                $params[] = $cursor;
            }
            $query .= " ORDER BY o.id DESC  LIMIT ?";

          $stmt = $this->connection->prepare($query);
          foreach ($params as $i => $v) {
              $stmt->bindValue($i + 1, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
          }
          $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
          $stmt->execute();
          $this->response->success($stmt->fetchAll(PDO::FETCH_ASSOC));
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
            $stmt = $this->connection->prepare("SELECT o.id, o.titulo, o.descripcion, o.requisitos,
                                   o.institucion_id, i.nombre AS institucion,
                                   o.carrera_id, c.nombre AS carrera,
                                   o.modalidad, o.ubicacion, o.fecha_publicacion, o.fecha_cierre, o.estado_oportunidad,
                                   o.creado_por, CONCAT(u.nombre, ' ', u.apellido) AS creado_por_nombre,
                                   o.creado_en, o.visto
                            FROM oportunidades o
                            INNER JOIN usuarios u ON u.id = o.creado_por
                            LEFT JOIN instituciones i ON i.id = o.institucion_id
                            LEFT JOIN carreras c ON c.id = o.carrera_id
                            WHERE o.estado = 1 AND o.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Oportunidad no encontrada");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por creador (las ofertas que publicó un reclutador)
    public function findByCreador(int $creado_por){
        if ($creado_por <= 0) {
            $this->response->error("El ID del creador es invalido");
        }
        try {
            $stmt = $this->connection->prepare("SELECT o.id, o.titulo, o.descripcion, o.requisitos,
                                   o.institucion_id, i.nombre AS institucion,
                                   o.carrera_id, c.nombre AS carrera,
                                   o.modalidad, o.ubicacion, o.fecha_publicacion, o.fecha_cierre, o.estado_oportunidad,
                                   o.creado_por, CONCAT(u.nombre, ' ', u.apellido) AS creado_por_nombre,
                                   o.creado_en, o.visto
                            FROM oportunidades o
                            INNER JOIN usuarios u ON u.id = o.creado_por
                            LEFT JOIN instituciones i ON i.id = o.institucion_id
                            LEFT JOIN carreras c ON c.id = o.carrera_id
                            WHERE o.estado = 1 AND o.creado_por = ? ORDER BY o.fecha_publicacion DESC");
            $stmt->execute([$creado_por]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear oportunidad (solo usuarios autorizados a publicar o administradores)
    public function add(array $arrayData) {
        $creado_por = (int)($arrayData["creado_por"] ?? 0);
        $data = $this->validate($arrayData);

        if ($creado_por <= 0) {
            $this->response->error("El creador es obligatorio");
        }

        try {
            $stmt = $this->connection->prepare("SELECT u.autorizado_publicar, r.nombre AS rol FROM usuarios u
                                                INNER JOIN roles r ON r.id = u.rol_id
                                                WHERE u.id = ? AND u.estado = 1 AND u.estado_cuenta = 'activo'");
            $stmt->execute([$creado_por]);
            $creador = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$creador) {
                $this->response->error("El creador no existe o no está activo");
            }

            if ((int)$creador['autorizado_publicar'] !== 1 && $creador['rol'] !== 'administrador') {
                $this->response->error("El usuario no está autorizado para publicar oportunidades");
            }

            $query = "INSERT INTO oportunidades (titulo, descripcion, requisitos, institucion_id, carrera_id, modalidad, ubicacion, fecha_publicacion, fecha_cierre, creado_por)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                $data['titulo'], $data['descripcion'], $data['requisitos'], $data['institucion_id'], $data['carrera_id'],
                $data['modalidad'], $data['ubicacion'], $data['fecha_publicacion'], $data['fecha_cierre'], $creado_por
            ]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo publicar la oportunidad");
            }

            $this->response->success("Oportunidad publicada con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar oportunidad
    public function update(array $arrayData){
        $id                 = (int)($arrayData["id"] ?? 0);
        $estado_oportunidad = trim($arrayData["estado_oportunidad"] ?? 'activa');
        $visto              = (int)($arrayData["visto"] ?? 0) === 1 ? 1 : 0;

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        if (!in_array($estado_oportunidad, self::ESTADOS_OPORTUNIDAD, true)) {
            $this->response->error("El estado no es valido");
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE oportunidades SET titulo = ?, descripcion = ?, requisitos = ?, institucion_id = ?, carrera_id = ?,
                             modalidad = ?, ubicacion = ?, fecha_publicacion = ?, fecha_cierre = ?, estado_oportunidad = ?, visto = ?
                      WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                $data['titulo'], $data['descripcion'], $data['requisitos'], $data['institucion_id'], $data['carrera_id'],
                $data['modalidad'], $data['ubicacion'], $data['fecha_publicacion'], $data['fecha_cierre'], $estado_oportunidad, $visto, $id
            ]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Oportunidad no encontrada o sin cambios");
            }

            $this->response->success("Oportunidad actualizada correctamente");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar oportunidad (borrado lógico)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $query = "UPDATE oportunidades SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID o ya esta inactivo.");
            }

            $this->response->success("Oportunidad cancelada con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $titulo            = trim($arrayData["titulo"] ?? '');
        $descripcion       = trim($arrayData["descripcion"] ?? '');
        $requisitos        = trim($arrayData["requisitos"] ?? '');
        $institucion_id    = (int)($arrayData["institucion_id"] ?? 0);
        $carrera_id        = (int)($arrayData["carrera_id"] ?? 0);
        $modalidad         = trim($arrayData["modalidad"] ?? 'presencial');
        $ubicacion         = trim($arrayData["ubicacion"] ?? '');
        $fecha_publicacion = trim($arrayData["fecha_publicacion"] ?? '');
        $fecha_cierre      = trim($arrayData["fecha_cierre"] ?? '');

        if ($fecha_publicacion === '') {
            $fecha_publicacion = date('Y-m-d');
        }

        if ($titulo === '' || mb_strlen($titulo) > 150) {
            $this->response->error("El título es obligatorio y no debe superar 150 caracteres");
        }

        if ($descripcion === '') {
            $this->response->error("La descripción es obligatoria");
        }

        if (!in_array($modalidad, self::MODALIDADES, true)) {
            $this->response->error("La modalidad no es valida");
        }

        if (mb_strlen($ubicacion) > 150) {
            $this->response->error("La ubicación no debe superar 150 caracteres");
        }

        if (!$this->isDate($fecha_publicacion)) {
            $this->response->error("La fecha de publicación no es valida (formato YYYY-MM-DD)");
        }

        if (!$this->isDate($fecha_cierre)) {
            $this->response->error("La fecha de cierre no es valida (formato YYYY-MM-DD)");
        }

        if ($fecha_cierre < $fecha_publicacion) {
            $this->response->error("La fecha de cierre no puede ser anterior a la fecha de publicación");
        }

        if ($institucion_id > 0) {
            $stmt = $this->connection->prepare("SELECT id FROM instituciones WHERE id = ? AND estado = 1");
            $stmt->execute([$institucion_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La institución no existe");
            }
        }

        if ($carrera_id > 0) {
            $stmt = $this->connection->prepare("SELECT id FROM carreras WHERE id = ? AND estado = 1");
            $stmt->execute([$carrera_id]);
            if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
                $this->response->error("La carrera no existe");
            }
        }

        return [
            'titulo'            => $titulo,
            'descripcion'       => $descripcion,
            'requisitos'        => $requisitos !== '' ? $requisitos : null,
            'institucion_id'    => $institucion_id > 0 ? $institucion_id : null,
            'carrera_id'        => $carrera_id > 0 ? $carrera_id : null,
            'modalidad'         => $modalidad,
            'ubicacion'         => $ubicacion !== '' ? $ubicacion : null,
            'fecha_publicacion' => $fecha_publicacion,
            'fecha_cierre'      => $fecha_cierre,
        ];
    }

    private function isDate(string $value): bool {
        $date = DateTime::createFromFormat('Y-m-d', $value);
        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
