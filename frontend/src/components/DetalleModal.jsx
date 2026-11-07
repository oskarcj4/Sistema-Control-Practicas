import { useState } from "react";
import { enlaceCompleto, irA } from "../helpers/rutas";
import DetalleOferta from "./DetalleOferta";

// Ventana modal con el detalle completo de una oportunidad.
//
// Props:
//   oportunidad -> la oferta a mostrar. Si es null, el modal NO se dibuja.
//   onCerrar    -> función que cierra el modal
//   children    -> acciones al final (formulario de postulación, postulantes...)
export default function DetalleModal({ oportunidad, onCerrar, children }) {
  const [copiado, setCopiado] = useState(false);

  if (!oportunidad) {
    return null;
  }

  const ruta = `#/oferta/${oportunidad.id}`;

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(enlaceCompleto(ruta));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: se abre la página y el usuario copia la URL
      irA(ruta);
    }
  }

  return (
    // Capa 1: fondo oscuro; clic fuera cierra. Capa 2: caja blanca (stopPropagation).
    <div onClick={onCerrar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-4 top-4 cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ×
        </button>

        <DetalleOferta oportunidad={oportunidad}>{children}</DetalleOferta>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={copiarEnlace}
            className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copiado ? "✓ Enlace copiado" : "🔗 Copiar enlace"}
          </button>
          <button
            type="button"
            onClick={() => irA(ruta)}
            className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Abrir página de la oferta
          </button>
        </div>
      </div>
    </div>
  );
}
