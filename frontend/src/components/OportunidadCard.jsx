import {
  COLOR_MODALIDAD,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";


// COMPONENTE REUTILIZABLE

// T2 - Tarjeta visual de una oportunidad de práctica.
// No llama a la API: recibe todo por props.
//
// Props:
//   oportunidad -> objeto que viene de GET oportunidades.php
//                  (titulo, institucion, carrera, modalidad, fecha_cierre, descripcion...)
//   onVerMas    -> función que se ejecuta al hacer clic en "Ver más"
//                  (en T6 la usarás para abrir el modal)
export default function OportunidadCard({ oportunidad, onVerMas }) {
  const colorModalidad =
    COLOR_MODALIDAD[oportunidad.modalidad] || "bg-slate-100 text-slate-700";
  const textoModalidad =
    TEXTO_MODALIDAD[oportunidad.modalidad] || oportunidad.modalidad;

  const inicialInstitucion = (oportunidad.institucion || "P").charAt(0).toUpperCase();

  return (
    <article className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      {/* Cabecera estilo post: Avatar + Institución + Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700">
            {inicialInstitucion}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">
              {oportunidad.institucion || "Institución no especificada"}
            </h4>
            <p className="text-xs text-slate-500">
              🎓 {oportunidad.carrera || "Cualquier carrera"} {oportunidad.ubicacion ? `· 📍 ${oportunidad.ubicacion}` : ""}
            </p>
          </div>
        </div>

        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${colorModalidad}`}>
          {textoModalidad}
        </span>
      </div>

      {/* Cuerpo de la publicación */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-slate-800">{oportunidad.titulo}</h3>

        {oportunidad.descripcion && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {oportunidad.descripcion}
          </p>
        )}
      </div>

      {/* Pie de la publicación */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs font-medium text-slate-500">
          📅 Cierre: {formatearFecha(oportunidad.fecha_cierre)}
        </span>
        {oportunidad.mi_postulacion && (
          <span className="ml-auto mr-3 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
            ✓ Ya postulado
          </span>
        )}
        <button
          type="button"
          onClick={onVerMas}
          className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Ver más
        </button>
      </div>
    </article>
  );
}
