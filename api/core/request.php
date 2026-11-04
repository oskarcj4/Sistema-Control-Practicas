<?php

require_once __DIR__ . "/response.php";

/**
 * Lee y valida el cuerpo JSON de la petición.
 *
 * Solo aplica a los métodos que llevan cuerpo (POST, PUT, QUERY). Para el resto
 * devuelve un arreglo vacío. Corta la ejecución con HTTP 400 si:
 *  - el Content-Type no es application/json
 *  - el cuerpo viene vacío
 *  - el JSON está mal formado
 *  - el JSON no es un objeto (por ejemplo "123" o "[1,2]")
 *
 * @param string   $method  Método HTTP de la petición
 * @param string[] $metodos Métodos que requieren cuerpo JSON
 * @return array Datos decodificados
 */
function readJsonInput(string $method, array $metodos = ['POST', 'PUT', 'QUERY']): array
{
    if (!in_array($method, $metodos, true)) {
        return [];
    }

    $contentType = $_SERVER["CONTENT_TYPE"] ?? "";
    if (empty($contentType) || stripos($contentType, 'application/json') === false) {
        Response::error("Petición inválida: se esperaba Content-Type application/json.", -1, httpCode: 400);
    }

    $rawInput = file_get_contents("php://input");
    if ($rawInput === false || trim($rawInput) === '') {
        Response::error("Petición inválida: cuerpo vacío.", -1, httpCode: 400);
    }

    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        Response::error("Petición inválida: JSON mal formado.", -1, httpCode: 400);
    }

    # Debe ser un objeto: un arreglo JSON ([1,2]) decodifica con llaves 0..n-1
    if (!is_array($data) || ($data !== [] && array_keys($data) === range(0, count($data) - 1))) {
        Response::error("Petición inválida: se esperaba un objeto JSON.", -1, httpCode: 400);
    }

    return $data;
}

/**
 * Obtiene un campo del JSON como string recortado.
 * Si el valor no es escalar (arreglo u objeto) devuelve el valor por defecto,
 * así trim() nunca recibe un tipo inválido.
 */
function inputString(array $data, string $key, string $default = ''): string
{
    $value = $data[$key] ?? null;
    if ($value === null || !is_scalar($value)) {
        return $default;
    }
    if (is_bool($value)) {
        return $value ? '1' : '0';
    }
    return trim((string)$value);
}
