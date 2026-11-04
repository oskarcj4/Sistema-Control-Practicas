export const BASE_API = "/SistemaControlPracticas/api/endpoints";

const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

// El token CSRF vive solo en memoria. El backend lo devuelve al iniciar sesión
// y al restaurar sesión (GET login.php). Nunca se guarda en localStorage.
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

// Signal permite utilizar Abort Controller, para cancelar peticiones HTTP.
export async function apiFetch(ruta, { method = "GET", body, signal } = {}) {
  const metodo = method.toUpperCase();
  const headers = {};

  if (!METODOS_SEGUROS.includes(metodo) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  // El backend solo acepta JSON (Content-Type: application/json) en POST/PUT/QUERY.
  // Los parámetros de GET y DELETE van en la query string de la ruta.
  let cuerpo;
  if (body !== undefined && body !== null) {
    const datos = body instanceof FormData ? Object.fromEntries(body) : body;
    cuerpo = JSON.stringify(datos);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_API}/${ruta}`, {
    method: metodo,
    body: cuerpo,
    headers,
    credentials: "include",
    signal,
  });

  let resultado = {};
  try {
    resultado = await res.json();
  } catch {
    resultado = {};
  }

  if (!res.ok || (resultado.code !== undefined && resultado.code !== 1)) {
    const error = new Error(resultado.message || `Error ${res.status}`);
    error.code = resultado.code;
    error.status = res.status;
    throw error;
  }

  // El backend manda el CROSS-SITE-REQUEST-FORGERY no lo almacenamos en memoria, si no el backend
  // lo manda en la peticion.
  if (resultado.data && resultado.data.csrfToken) {
    setCsrfToken(resultado.data.csrfToken);
  }

  return resultado;
}
