import {
  COLOR_ESTADO_POSTULACION,
  TEXTO_ESTADO_POSTULACION,
  formatearFecha,
} from "../helpers/estilos";

//  Tabla de estudiantes que se postularon a una oferta (vista del reclutador).
// Solo dibuja. La carga de datos (GET postulaciones.php?oportunidad_id=X) la haces tú.
//
// Props:
//   postulantes -> arreglo de postulaciones
//   onAceptar   -> (opcional) función(postulacion) para el botón Aceptar   (T13)
//   onRechazar  -> (opcional) función(postulacion) para el botón Rechazar  (T13)
//   Si no pasas onAceptar / onRechazar, la columna de acciones no aparece.
export default function TablaPostulantes({ postulantes, onAceptar, onRechazar }) {
  const mostrarAcciones = Boolean(onAceptar || onRechazar);

  return (
    // overflow-x-auto: en celular la tabla se puede deslizar de lado sin romper la página
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Estudiante</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Documentos</th>
            <th className="px-4 py-3">Mensaje</th>
            <th className="px-4 py-3">Estado</th>
            {mostrarAcciones && <th className="px-4 py-3">Acciones</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {postulantes.map((p) => (
            <tr key={p.id} className="align-top">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{p.estudiante}</p>
                <p className="text-xs text-slate-500">{p.email}</p>
                {p.carrera && <p className="text-xs text-slate-500">🎓 {p.carrera}</p>}
                {p.carnet && <p className="text-xs text-slate-400">Carnet: {p.carnet}</p>}
              </td>

              <td className="px-4 py-3 text-slate-600">{formatearFecha(p.fecha_postulacion)}</td>

              <td className="px-4 py-3">
                <a
                  href={p.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-indigo-600 hover:underline"
                >
                  Ver CV
                </a>
                {p.constancia_estudios_url && (
                  <a
                    href={p.constancia_estudios_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-indigo-600 hover:underline"
                  >
                    Constancia
                  </a>
                )}
              </td>

              <td className="max-w-xs px-4 py-3 text-slate-600">
                {p.mensaje_presentacion || <span className="text-slate-400">Sin mensaje</span>}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                    COLOR_ESTADO_POSTULACION[p.estado_postulacion] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {TEXTO_ESTADO_POSTULACION[p.estado_postulacion] || p.estado_postulacion}
                </span>
              </td>

              {mostrarAcciones && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onAceptar && (
                      <button
                        type="button"
                        onClick={() => onAceptar(p)}
                        className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Aceptar
                      </button>
                    )}
                    {onRechazar && (
                      <button
                        type="button"
                        onClick={() => onRechazar(p)}
                        className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Rechazar
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
