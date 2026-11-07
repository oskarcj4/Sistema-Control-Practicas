import {
  COLOR_ESTADO_OPORTUNIDAD,
  COLOR_MODALIDAD,
  TEXTO_ESTADO_OPORTUNIDAD,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";
import { irA } from "../helpers/rutas";

// Contenido de una oferta (sin marco). Lo usan DetalleModal y OfertaPage.
//
// Props:
//   oportunidad -> objeto de GET oportunidades.php
//   children    -> acciones que van al final (postularse, postulantes...)
export default function DetalleOferta({ oportunidad, children }) {
  const colorModalidad = COLOR_MODALIDAD[oportunidad.modalidad] || "bg-slate-100 text-slate-700";
  const noActiva = oportunidad.estado_oportunidad && oportunidad.estado_oportunidad !== "activa";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colorModalidad}`}>
          {TEXTO_MODALIDAD[oportunidad.modalidad] || oportunidad.modalidad}
        </span>
        {noActiva && (
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              COLOR_ESTADO_OPORTUNIDAD[oportunidad.estado_oportunidad] || "bg-slate-100 text-slate-700"
            }`}
          >
            {TEXTO_ESTADO_OPORTUNIDAD[oportunidad.estado_oportunidad] || oportunidad.estado_oportunidad}
          </span>
        )}
      </div>

      <h2 className="mt-3 pr-8 text-2xl font-bold text-slate-800">{oportunidad.titulo}</h2>

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>🏢 {oportunidad.institucion || "Institución no especificada"}</p>
        <p>🎓 {oportunidad.carrera || "Cualquier carrera"}</p>
        {oportunidad.ubicacion && <p>📍 {oportunidad.ubicacion}</p>}
        <p>📅 Fecha límite: {formatearFecha(oportunidad.fecha_cierre)}</p>
        {oportunidad.creado_por_nombre && (
          <p>
            👤 Publicada por{" "}
            <button
              type="button"
              onClick={() => irA(`#/usuario/${oportunidad.creado_por}`)}
              className="cursor-pointer font-medium text-indigo-600 hover:underline"
            >
              {oportunidad.creado_por_nombre}
            </button>
          </p>
        )}
      </div>

      <section className="mt-5">
        <h3 className="font-semibold text-slate-700">Descripción</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{oportunidad.descripcion}</p>
      </section>

      <section className="mt-5">
        <h3 className="font-semibold text-slate-700">Requisitos</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
          {oportunidad.requisitos || "No se especificaron requisitos."}
        </p>
      </section>

      {children && <div className="mt-6 border-t border-slate-200 pt-5">{children}</div>}
    </>
  );
}
