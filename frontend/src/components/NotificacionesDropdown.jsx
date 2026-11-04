import { useState } from "react";
import { formatearFecha } from "../helpers/estilos";

// T17 - Campana de notificaciones con menú desplegable.
// Solo dibuja. La carga (GET notificaciones.php?no_leidas=1) y el PUT de
// marcar como leída (T18) los haces tú.
//
// Props:
//   notificaciones -> arreglo { id, titulo, mensaje, leido, fecha_creacion }
//   onClickNotificacion -> (opcional) función(notificacion) al hacer clic en una
export default function NotificacionesDropdown({ notificaciones = [], onClickNotificacion }) {
  // abierto = true -> se ve el menú; false -> está oculto.
  const [abierto, setAbierto] = useState(false);

  // Contamos solo las que tienen leido = 0
  const noLeidas = notificaciones.filter((n) => Number(n.leido) === 0).length;

  return (
    // ⚠️ IMPORTANTE: "relative" en el contenedor + "absolute" en el menú
    // hace que el menú aparezca justo debajo de la campana.
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="relative cursor-pointer rounded-full p-2 text-xl hover:bg-slate-100"
        aria-label="Notificaciones"
      >
        🔔
        {/* Insignia roja: solo aparece si hay notificaciones sin leer */}
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Notificaciones
          </p>

          {notificaciones.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              No tienes notificaciones 🎉
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onClickNotificacion && onClickNotificacion(n)}
                    className={`block w-full cursor-pointer px-4 py-3 text-left hover:bg-slate-50 ${
                      Number(n.leido) === 0 ? "bg-indigo-50/60" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">{n.titulo}</p>
                    <p className="text-xs text-slate-600">{n.mensaje}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatearFecha(n.fecha_creacion)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
