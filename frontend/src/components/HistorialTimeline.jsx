import { TEXTO_ESTADO_POSTULACION, formatearFecha } from "../helpers/estilos";

// T19 - Línea de tiempo con los cambios de estado de una postulación.
// Solo dibuja. La carga (GET historial_estado_postulacion.php?postulacion_id=X) la haces tú.
//
// Props:
//   historial -> arreglo { id, estado_anterior, estado_nuevo, comentario,
//                          actualizado_por_nombre, fecha }
export default function HistorialTimeline({ historial }) {
  if (historial.length === 0) {
    return <p className="text-sm text-slate-400">Todavía no hay cambios de estado.</p>;
  }

  return (
    // ⚠️ IMPORTANTE: la línea vertical es el borde izquierdo de la lista (border-l).
    // Cada punto es un círculo con "absolute -left-..." que se monta encima de esa línea.
    <ol className="relative ml-3 border-l-2 border-slate-200">
      {historial.map((cambio) => (
        <li key={cambio.id} className="mb-6 ml-6 last:mb-0">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white bg-indigo-600" />

          <p className="text-xs text-slate-400">{formatearFecha(cambio.fecha)}</p>
          <p className="text-sm font-medium text-slate-800">
            {TEXTO_ESTADO_POSTULACION[cambio.estado_anterior] || cambio.estado_anterior}
            {"  →  "}
            {TEXTO_ESTADO_POSTULACION[cambio.estado_nuevo] || cambio.estado_nuevo}
          </p>
          {cambio.comentario && (
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
              "{cambio.comentario}"
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">Por: {cambio.actualizado_por_nombre}</p>
        </li>
      ))}
    </ol>
  );
}
