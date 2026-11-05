<?php

class Login {
    private Connection $connection;
    private Response $response;

    private const ROL_ADMIN = 2; # ver database/seed.sql

    public function __construct(Connection $connection, Response $response){
        $this->connection = $connection;
        $this->response = $response;
    }

    # Inicia sesión: valida credenciales y deja la cookie firmada que lee checkAuth()
    public function login(array $arrayData) {
        $identificador = trim($arrayData["identificador"] ?? '');
        $contrasena    = $arrayData["contrasena"] ?? '';

        if (mb_strlen($identificador) < 3 || mb_strlen($identificador) > 150) {
            $this->response->error("El identificador de usuario no es valido", -1, 400);
        }

        if (strlen($contrasena) < 8) {
            $this->response->error("La contraseña debe tener al menos 8 caracteres", -1, 400);
        }

        # Email o username; la columna sale de una lista fija, el valor va como parámetro
        $columna = filter_var($identificador, FILTER_VALIDATE_EMAIL) ? 'u.email' : 'u.username';

        try {
            # Los roles viven solo en asignaciones_roles (usuarios no tiene rol_id)
            $query = "SELECT u.id, u.username, u.nombre, u.apellido, u.password_hash,
                             (SELECT GROUP_CONCAT(ar.id_rol ORDER BY ar.id_rol)
                                FROM asignaciones_roles ar
                               WHERE ar.id_usuario = u.id AND ar.estado = 1) AS roles
                      FROM usuarios u
                      WHERE $columna = ? AND u.estado = 1 AND u.estado_cuenta = 'activo'";
            $stmt = $this->connection->prepare($query);
            $stmt->execute([$identificador]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result || !password_verify($contrasena, $result["password_hash"])) {
                $this->response->error("La contraseña y el usuario no coinciden", -1, 401);
            }

            # GROUP_CONCAT devuelve "1,3" o NULL si no tiene roles asignados
            $roles = $result['roles'] !== null
                ? array_map('intval', explode(',', $result['roles']))
                : [];

            $payload = [
                'id'       => (int)$result['id'],
                'username' => $result['username'],
                'name'     => $result['nombre'] . ' ' . $result['apellido'],
                'roles'    => implode(',', $roles),
                'isAdmin'  => in_array(self::ROL_ADMIN, $roles, true),
                'exp'      => time() + (int)COOKIE_LIFETIME,
                'ip'       => $_SERVER['REMOTE_ADDR'] ?? '',
            ];

            # Mismo formato que valida checkAuth(): "<base64(json)>|<hmac hex>"
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
            $cookieValue = base64_encode($json) . '|' . hash_hmac('sha256', $json, COOKIE_KEY);

            setcookie(COOKIE_NAME, $cookieValue, [
                'expires'  => $payload['exp'],
                'path'     => '/',
                'domain'   => COOKIE_DOMAIN,
                'secure'   => filter_var(COOKIE_SECURE, FILTER_VALIDATE_BOOLEAN),
                'httponly' => filter_var(COOKIE_HTTPONLY, FILTER_VALIDATE_BOOLEAN),
                'samesite' => COOKIE_SAMESITE,
            ]);

            # El token CSRF depende de la cookie nueva
            $_COOKIE[COOKIE_NAME] = $cookieValue;

            $this->response->success([
                'id'        => $payload['id'],
                'username'  => $payload['username'],
                'name'      => $payload['name'],
                'roles'     => $payload['roles'],
                'isAdmin'   => $payload['isAdmin'],
                'csrfToken' => csrfToken()
            ], "Logueado exitosamente");
        } catch (PDOException $e) {
            Response::error("Error", -1, 500);
            //Response::debugError($e);
        }
    }

    # Cierra sesión: borra la cookie
    public function logout() {
        setcookie(COOKIE_NAME, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'domain'   => COOKIE_DOMAIN,
            'secure'   => filter_var(COOKIE_SECURE, FILTER_VALIDATE_BOOLEAN),
            'httponly' => filter_var(COOKIE_HTTPONLY, FILTER_VALIDATE_BOOLEAN),
            'samesite' => COOKIE_SAMESITE,
        ]);
        $this->response->success([], "Sesión cerrada");
    }
}
