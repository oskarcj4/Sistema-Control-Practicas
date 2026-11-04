import {
  COLOR_MODALIDAD,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";

// T5 - Ventana modal con el detalle completo de una oportunidad.
//
// Props:
//   oportunidad -> la oferta a mostrar. Si es null, el modal NO se dibuja.
//   onCerrar    -> función que cierra el modal (en T6 hará setOportunidadSeleccionada(null))
//   children    -> lo que pongas entre <DetalleModal> ... </DetalleModal>
//                  aparece al final. Ahí irá tu <PostularseForm /> (T7).
//
// Ejemplo de uso (T6):
//   <DetalleModal oportunidad={oportunidadSeleccionada} onCerrar={() => setOportunidadSeleccionada(null)}>
//     <PostularseForm oportunidad={oportunidadSeleccionada} />
//   </DetalleModal>
export default function DetalleModal({ oportunidad, onCerrar, children }) {
  // Si no hay oportunidad seleccionada, no se muestra nada.
  if (!oportunidad) {
    return null;
  }

  const colorModalidad =
    COLOR_MODALIDAD[oportunidad.modalidad] || "bg-slate-100 text-slate-700";

  return (
    // ⚠️ IMPORTANTE: Capa 1 = fondo oscuro semitransparente que cubre TODA la pantalla.
    // "fixed inset-0" la pega a los 4 bordes de la ventana; "z-50" la pone encima de todo.
    // Al hacer clic en el fondo se cierra el modal.
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {/* ⚠️ IMPORTANTE: Capa 2 = la caja blanca.
          e.stopPropagation() evita que un clic DENTRO de la caja "suba" hasta el fondo
          y cierre el modal por accidente. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Botón X */}
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-4 top-4 cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ×
        </button>

        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colorModalidad}`}>
          {TEXTO_MODALIDAD[oportunidad.modalidad] || oportunidad.modalidad}
        </span>

        <h2 className="mt-3 pr-8 text-2xl font-bold text-slate-800">{oportunidad.titulo}</h2>

        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p>🏢 {oportunidad.institucion || "Institución no especificada"}</p>
          <p>🎓 {oportunidad.carrera || "Cualquier carrera"}</p>
          {oportunidad.ubicacion && <p>📍 {oportunidad.ubicacion}</p>}
          <p>📅 Fecha límite: {formatearFecha(oportunidad.fecha_cierre)}</p>
        </div>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-700">Descripción</h3>
          {/* whitespace-pre-line respeta los saltos de línea del texto */}
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
            {oportunidad.descripcion}
          </p>
        </section>

        <section className="mt-5">
          <h3 className="font-semibold text-slate-700">Requisitos</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
            {oportunidad.requisitos || "No se especificaron requisitos."}
          </p>
        </section>

        {/* Aquí aparece lo que pases como children (el formulario de postulación). */}
        {children && <div className="mt-6 border-t border-slate-200 pt-5">{children}</div>}
      </div>
    </div>
  );
}
