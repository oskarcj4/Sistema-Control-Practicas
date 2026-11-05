<?php

class Response
{
    public static function json($code, $message = "", $data = [], $httpCode = 200)
    {
        http_response_code($httpCode);
        echo json_encode([
            "code" => $code,
            "message" => $message,
            "data" => $data
        ]);
        exit;
    }

    public static function success($data = [], $message = "Operación exitosa")
    {
        self::json(1, $message, $data);
    }

    public static function error($message = "Ocurrió un error", $code = -1, $httpCode = 200)
    {
        self::json($code, $message, [], $httpCode);
    }

    public static function invalidAccess()
    {
        self::json(-2, "No tienes permisos para acceder a este recurso", [], 200);
    }

    public static function invalidMethod()
    {
        self::json(-3, "Método no soportado", [], 200);
    }

    public static function invalidParams()
    {
        self::json(-4, "Parámetros inválidos", [], 200);
    }

    public static function debugError($message, $httpCode = 500)
    {
        self::json(-999, $message->getMessage(), [], 200);
    }
}
