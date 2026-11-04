import {
  COLOR_ESTADO_POSTULACION,
  TEXTO_ESTADO_POSTULACION,
  formatearFecha,
} from "../helpers/estilos";

// T9 - Tarjeta visual de una postulación del estudiante ("Mis Postulaciones").
//
// Props:
//   postulacion  -> objeto de GET postulaciones.php?estudiante_id=X
//                   (oportunidad, fecha_postulacion, estado_postulacion, cv_url...)
//   onVerHistorial -> (opcional) función para ver la línea de tiempo (T19).
//                     Si no la pasas, el botón no aparece.
export default function PostulacionCard({ postulacion, onVerHistorial }) {
  const estado = postulacion.estado_postulacion;
  const colorEstado = COLOR_ESTADO_POSTULACION[estado] || "bg-slate-100 text-slate-700";
  const textoEstado = TEXTO_ESTADO_POSTULACION[estado] || estado;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-bold text-slate-800">{postulacion.oportunidad}</h3>
        <p className="text-sm text-slate-500">
          Postulado el {formatearFecha(postulacion.fecha_postulacion)}
        </p>
        {postulacion.cv_url && (
          <a
            href={postulacion.cv_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-600 hover:underline"
          >
            Ver CV enviado
          </a>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colorEstado}`}>
          {textoEstado}
        </span>
        {onVerHistorial && (
          <button
            type="button"
            onClick={onVerHistorial}
            className="cursor-pointer text-sm font-medium text-indigo-600 hover:underline"
          >
            Historial
          </button>
        )}
      </div>
    </article>
  );
}
