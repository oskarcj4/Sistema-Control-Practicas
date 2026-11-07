import { useState } from "react";
import { formatearFecha } from "../helpers/estilos";
import BotonConfirmar from "./ui/BotonConfirmar";
import EstadoVacio from "./ui/EstadoVacio";

// Buzón de notificaciones del usuario (pestaña "Buzón").
// No hace llamadas: MainPage es dueño de la lista para que la campana y el buzón
// muestren siempre lo mismo.
//
// Props:
//   notificaciones -> arreglo { id, titulo, mensaje, leido, fecha_creacion }
//   onMarcarLeida(notificacion, leido) -> PUT accion=leer
//   onMarcarTodas()                    -> PUT accion=leer_todas
//   onEliminar(notificacion)           -> DELETE ?id=
//   onAbrir(notificacion)              -> marca leída y abre su enlace (si tiene)
export default function BuzonNotificaciones({ notificaciones = [], onMarcarLeida, onMarcarTodas, onEliminar, onAbrir }) {
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const noLeidas = notificaciones.filter((n) => Number(n.leido) === 0).length;
  const visibles = soloNoLeidas ? notificaciones.filter((n) => Number(n.leido) === 0) : notificaciones;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Buzón</h2>
          <p className="text-sm text-slate-500">
            {noLeidas === 0 ? "No tienes notificaciones sin leer." : `${noLeidas} sin leer.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
            {[
              { valor: false, texto: "Todas" },
              { valor: true, texto: "No leídas" },
            ].map((f) => (
              <button
                key={f.texto}
                type="button"
                onClick={() => setSoloNoLeidas(f.valor)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  soloNoLeidas === f.valor ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.texto}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onMarcarTodas}
            disabled={noLeidas === 0}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Marcar todas como leídas
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <EstadoVacio
          icono="🔔"
          titulo={soloNoLeidas ? "Nada pendiente" : "Tu buzón está vacío"}
          mensaje="Aquí verás avisos de tus postulaciones, solicitudes y ofertas."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {visibles.map((n) => {
            const leida = Number(n.leido) === 1;
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 ${leida ? "" : "bg-indigo-50/60"}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${leida ? "bg-transparent" : "bg-indigo-600"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm text-slate-800 ${leida ? "font-medium" : "font-semibold"}`}>{n.titulo}</p>
                  <p className="whitespace-pre-line text-sm text-slate-600">{n.mensaje}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatearFecha(n.fecha_creacion)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {n.enlace && onAbrir && (
                    <button
                      type="button"
                      onClick={() => onAbrir(n)}
                      className="cursor-pointer rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      Abrir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onMarcarLeida(n, leida ? 0 : 1)}
                    className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    {leida ? "Marcar no leída" : "Marcar leída"}
                  </button>
                  <BotonConfirmar texto="Eliminar" pregunta="¿Eliminar?" onConfirmar={() => onEliminar(n)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
