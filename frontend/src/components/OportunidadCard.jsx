import {
  COLOR_MODALIDAD,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";

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

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div>
        {/* Tag de modalidad */}
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colorModalidad}`}>
          {textoModalidad}
        </span>

        <h3 className="mt-3 text-lg font-bold text-slate-800">{oportunidad.titulo}</h3>

        <p className="mt-1 text-sm text-slate-600">
          🏢 {oportunidad.institucion || "Institución no especificada"}
        </p>
        <p className="text-sm text-slate-600">
          🎓 {oportunidad.carrera || "Cualquier carrera"}
        </p>

        {/* line-clamp-2 corta la descripción a 2 líneas y pone "..." */}
        {oportunidad.descripcion && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-500">{oportunidad.descripcion}</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">
          📅 Cierra: {formatearFecha(oportunidad.fecha_cierre)}
        </span>
        <button
          type="button"
          onClick={onVerMas}
          className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Ver más
        </button>
      </div>
    </article>
  );
}
