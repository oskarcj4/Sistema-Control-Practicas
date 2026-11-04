export const BASE_API = "/SistemaControlPracticas/api/endpoints";

const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

// El token CSRF vive solo en memoria. El backend lo devuelve al iniciar sesión
// y al restaurar sesión (GET login.php). Nunca se guarda en localStorage.
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export async function apiFetch(ruta, { method = "GET", body, signal } = {}) {
  const metodo = method.toUpperCase();
  const headers = {};

  if (!METODOS_SEGUROS.includes(metodo) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  let cuerpo = body;
  // PUT y DELETE: PHP lee el cuerpo con parse_str, así que va como x-www-form-urlencoded
  if (body && !(body instanceof FormData) && typeof body === "object") {
    cuerpo = new URLSearchParams(body);
  } else if (body instanceof FormData && metodo !== "POST") {
    cuerpo = new URLSearchParams(body);
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

  // Si el backend manda un token nuevo, se actualiza
  if (resultado.data && resultado.data.csrfToken) {
    setCsrfToken(resultado.data.csrfToken);
  }

  return resultado;
}
