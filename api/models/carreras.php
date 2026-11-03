<?php

class Carreras {
    private Connection $connection;
    private Response $response;
    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }
    public function findAll(){
        try {
            $stmt = $this->connection->prepare("SELECT c.nombre FROM carreras c ORDER BY c.nombre");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }
    # Mostrar todas las carreras
    public function findAllAfterRegister(){
        try {
            $stmt = $this->connection->prepare("SELECT c.id, c.institucion_id, i.nombre AS institucion, c.nombre, c.codigo, c.creado_en
                            FROM carreras c
                            INNER JOIN instituciones i ON i.id = c.institucion_id
                            ORDER BY i.nombre, c.nombre");
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
            $stmt = $this->connection->prepare("SELECT c.id, c.institucion_id, i.nombre AS institucion, c.nombre, c.codigo, c.creado_en
                            FROM carreras c
                            INNER JOIN instituciones i ON i.id = c.institucion_id
                            WHERE c.id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Carrera no encontrada");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por institución
    public function findByInstitucion(int $institucion_id){
        if ($institucion_id <= 0) {
            $this->response->error("El ID de institución es invalido");
        }
        try {
            $stmt = $this->connection->prepare("SELECT c.id, c.nombre
                            FROM carreras c
                            INNER JOIN instituciones i ON i.id = c.institucion_id
                            WHERE c.institucion_id = ? ORDER BY c.nombre");
            $stmt->execute([$institucion_id]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear carrera
    public function add(array $arrayData) {
        $data = $this->validate($arrayData);

        try {
            $query = "INSERT INTO carreras (institucion_id, nombre, codigo) VALUES (?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['institucion_id'], $data['nombre'], $data['codigo']]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo agregar la carrera");
            }

            $this->response->success("Carrera registrada con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("La institución ya tiene una carrera con ese nombre");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar carrera
    public function update(array $arrayData){
        $id = (int)($arrayData["id"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE carreras SET institucion_id = ?, nombre = ?, codigo = ? WHERE id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['institucion_id'], $data['nombre'], $data['codigo'], $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Carrera no encontrada o sin cambios");
            }

            $this->response->success("Carrera actualizada correctamente");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("La institución ya tiene una carrera con ese nombre");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar carrera
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $query = "DELETE FROM carreras WHERE id = ?";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se encontro el ID.");
            }

            $this->response->success("Carrera eliminada con éxito");
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $institucion_id = (int)($arrayData["institucion_id"] ?? 0);
        $nombre         = trim($arrayData["nombre"] ?? '');
        $codigo         = trim($arrayData["codigo"] ?? '');

        if ($institucion_id <= 0) {
            $this->response->error("La institución es obligatoria");
        }

        if ($nombre === '' || mb_strlen($nombre) > 150) {
            $this->response->error("El nombre es obligatorio y no debe superar 150 caracteres");
        }

        if (mb_strlen($codigo) > 30) {
            $this->response->error("El código no debe superar 30 caracteres");
        }

        $stmt = $this->connection->prepare("SELECT id FROM instituciones WHERE id = ?");
        $stmt->execute([$institucion_id]);
        if (!$stmt->fetch(PDO::FETCH_ASSOC)) {
            $this->response->error("La institución no existe");
        }

        return [
            'institucion_id' => $institucion_id,
            'nombre'         => $nombre,
            'codigo'         => $codigo !== '' ? $codigo : null,
        ];
    }
}
