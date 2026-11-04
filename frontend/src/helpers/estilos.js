// Colores y textos que se repiten en varios componentes.
// Tenerlos en un solo lugar evita escribir el mismo "if" en muchos archivos.

// ---------- Modalidad de una oportunidad ----------
export const COLOR_MODALIDAD = {
  remoto: "bg-green-100 text-green-700",
  presencial: "bg-blue-100 text-blue-700",
  hibrido: "bg-purple-100 text-purple-700",
};

export const TEXTO_MODALIDAD = {
  remoto: "Remoto",
  presencial: "Presencial",
  hibrido: "Híbrido",
};

// ---------- Estado de una postulación ----------
export const COLOR_ESTADO_POSTULACION = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_revision: "bg-blue-100 text-blue-700",
  aceptada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
};

export const TEXTO_ESTADO_POSTULACION = {
  pendiente: "🟡 Pendiente",
  en_revision: "🔵 En revisión",
  aceptada: "🟢 Aceptada",
  rechazada: "🔴 Rechazada",
};

// ---------- Roles (ids del seed de init.sql) ----------
export const ROL_ESTUDIANTE = 1;
export const ROL_ADMIN = 2;
export const ROL_RECLUTADOR = 3;

export const TEXTO_ROL = {
  1: "Estudiante",
  2: "Admin",
  3: "Reclutador",
};

export const COLOR_ROL = {
  1: "bg-sky-100 text-sky-700",
  2: "bg-rose-100 text-rose-700",
  3: "bg-amber-100 text-amber-700",
};

// El backend manda los roles como texto: "1,3".
// Esta función lo convierte en un arreglo de números: [1, 3].
export function obtenerRoles(usuario) {
  if (!usuario || !usuario.roles) {
    return [];
  }
  return String(usuario.roles)
    .split(",")
    .map((rol) => Number(rol));
}

// Convierte "2026-11-04 10:30:00" en "04/11/2026".
export function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }
  const soloFecha = String(fecha).slice(0, 10); // "2026-11-04"
  const partes = soloFecha.split("-"); // ["2026", "11", "04"]
  if (partes.length !== 3) {
    return fecha;
  }
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
