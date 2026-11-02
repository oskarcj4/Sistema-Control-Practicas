<?php

class Instituciones {
    private Connection $connection;
    private Response $response;

    private const TIPOS = ['universidad', 'empresa', 'startup_estudiantil', 'otra'];

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Mostrar todas las instituciones
    public function findAll(){
        try {
            $query = "SELECT id, nombre, siglas, tipo, contacto_email, sitio_web, creado_en
                      FROM instituciones WHERE estado = 1 ORDER BY nombre";
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
            $query = "SELECT id, nombre, siglas, tipo, contacto_email, sitio_web, creado_en
                      FROM instituciones WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                $this->response->error("Institución no encontrada");
            }

            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Filtrar por tipo
    public function findByTipo(string $tipo){
        if (!in_array($tipo, self::TIPOS, true)) {
            $this->response->error("El tipo no es valido");
        }
        try {
            $query = "SELECT id, nombre, siglas, tipo, contacto_email, sitio_web, creado_en
                      FROM instituciones WHERE tipo = ? AND estado = 1 ORDER BY nombre";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$tipo]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    public function findAllAcotado(){
            try {
            $query = "SELECT id, nombre
                      FROM instituciones WHERE estado = 1 ORDER BY nombre";
            $stmt = $this->connection->prepare($query);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->response->success($result);
        } catch (PDOException $e) {
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Crear institución
    public function add(array $arrayData) {
        $data = $this->validate($arrayData);

        try {
            $query = "INSERT INTO instituciones (nombre, siglas, tipo, contacto_email, sitio_web) VALUES (?, ?, ?, ?, ?)";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['nombre'], $data['siglas'], $data['tipo'], $data['contacto_email'], $data['sitio_web']]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("No se pudo agregar la institución");
            }

            $this->response->success("Institución registrada con éxito");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("Ya existe una institución con ese nombre (puede estar inactiva)");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Actualizar institución
    public function update(array $arrayData){
        $id = (int)($arrayData["id"] ?? 0);

        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        $data = $this->validate($arrayData);

        try {
            $query = "UPDATE instituciones SET nombre = ?, siglas = ?, tipo = ?, contacto_email = ?, sitio_web = ? WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$data['nombre'], $data['siglas'], $data['tipo'], $data['contacto_email'], $data['sitio_web'], $id]);

            if ($stmt->rowCount() === 0) {
                $this->response->error("Institución no encontrada o sin cambios");
            }

            $this->response->success("Institución actualizada correctamente");
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) === 1062) {
                $this->response->error("Ya existe una institución con ese nombre (puede estar inactiva)");
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    # Eliminar institución (borrado lógico, también desactiva sus carreras)
    public function delete(int $id){
        if ($id <= 0) {
            $this->response->error("El ID es invalido");
        }

        try {
            $this->connection->beginTransaction();

            $query = "UPDATE instituciones SET estado = 0 WHERE id = ? AND estado = 1";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                $this->connection->rollBack();
                $this->response->error("No se encontro el ID o ya esta inactivo.");
            }

            $stmt = $this->connection->prepare("UPDATE carreras SET estado = 0 WHERE institucion_id = ? AND estado = 1");
            $stmt->execute([$id]);

            $this->connection->commit();

            $this->response->success("Institución eliminada con éxito");
        } catch (PDOException $e) {
            if ($this->connection->inTransaction()) {
                $this->connection->rollBack();
            }
            Response::error("Error");
            //Response::debugError($e);
        }
    }

    private function validate(array $arrayData): array {
        $nombre         = trim($arrayData["nombre"] ?? '');
        $siglas         = trim($arrayData["siglas"] ?? '');
        $tipo           = trim($arrayData["tipo"] ?? 'empresa');
        $contacto_email = trim($arrayData["contacto_email"] ?? '');
        $sitio_web      = trim($arrayData["sitio_web"] ?? '');

        if ($nombre === '' || mb_strlen($nombre) > 150) {
            $this->response->error("El nombre es obligatorio y no debe superar 150 caracteres");
        }

        if (mb_strlen($siglas) > 20) {
            $this->response->error("Las siglas no deben superar 20 caracteres");
        }

        if (!in_array($tipo, self::TIPOS, true)) {
            $this->response->error("El tipo no es valido");
        }

        if ($contacto_email !== '' && (!filter_var($contacto_email, FILTER_VALIDATE_EMAIL) || mb_strlen($contacto_email) > 150)) {
            $this->response->error("El email de contacto no es correcto");
        }

        # Solo http/https: evita guardar enlaces "javascript:" que luego se pintan en el front
        if ($sitio_web !== '' && (!filter_var($sitio_web, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $sitio_web) || mb_strlen($sitio_web) > 255)) {
            $this->response->error("El sitio web no es una URL valida");
        }

        return [
            'nombre'         => $nombre,
            'siglas'         => $siglas !== '' ? $siglas : null,
            'tipo'           => $tipo,
            'contacto_email' => $contacto_email !== '' ? $contacto_email : null,
            'sitio_web'      => $sitio_web !== '' ? $sitio_web : null,
        ];
    }
}
