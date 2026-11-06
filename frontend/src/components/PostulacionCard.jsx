import BotonConfirmar from "./ui/BotonConfirmar";
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
//   onEditar       -> (opcional) función para editar. Solo se muestra si está pendiente.
//   onRetirar      -> (opcional) función async para retirar. Solo si está pendiente.
export default function PostulacionCard({ postulacion, onVerHistorial, onEditar, onRetirar }) {
  const pendiente = postulacion.estado_postulacion === "pendiente";
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
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {postulacion.cv_url && (
            <a
              href={postulacion.cv_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline"
            >
              📄 Ver CV
            </a>
          )}
          {postulacion.constancia_estudios_url && (
            <a
              href={postulacion.constancia_estudios_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline"
            >
              🎓 Ver Constancia
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        {pendiente && onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="cursor-pointer text-sm font-medium text-slate-600 hover:underline"
          >
            Editar
          </button>
        )}
        {pendiente && onRetirar && (
          <BotonConfirmar texto="Retirar" pregunta="¿Retirar postulación?" onConfirmar={onRetirar} />
        )}
      </div>
    </article>
  );
}
