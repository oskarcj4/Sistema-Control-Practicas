export default function extraerLista(respuesta) {
  if (Array.isArray(respuesta)) return respuesta;
  if (respuesta && Array.isArray(respuesta.data)) return respuesta.data;
  return [];
}
