import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { COLOR_ESTADO_SOLICITUD, TEXTO_ESTADO_SOLICITUD, formatearFecha } from "../helpers/estilos";
import BotonConfirmar from "./ui/BotonConfirmar";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

// Buzón del administrador para las solicitudes de publicación.
//   GET solicitudes_publicacion.php?estado_solicitud=X  (o sin filtro = todas)
//   PUT solicitudes_publicacion.php { accion: "revisar", id, estado_solicitud, comentario_admin }
//   DELETE solicitudes_publicacion.php?id=X
// El backend notifica al solicitante al aprobar / rechazar y, si se aprueba,
// lo marca como autorizado a publicar.
const FILTROS = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "aprobada", texto: "Aprobadas" },
  { valor: "rechazada", texto: "Rechazadas" },
  { valor: "", texto: "Todas" },
];

export default function BuzonSolicitudes() {
  const [filtro, setFiltro] = useState("pendiente");
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Solicitud abierta en el modal de revisión
  const [seleccionada, setSeleccionada] = useState(null);
  const [comentario, setComentario] = useState("");
  const [errorRevision, setErrorRevision] = useState(null);
  const [revisando, setRevisando] = useState(false);

  const cargar = useCallback(
    async (signal) => {
      try {
        setCargando(true);
        setError(null);
        const ruta = filtro
          ? `solicitudes_publicacion.php?estado_solicitud=${filtro}`
          : "solicitudes_publicacion.php";
        const res = await apiFetch(ruta, { signal });
        setSolicitudes(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [filtro]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  function abrir(solicitud) {
    setSeleccionada(solicitud);
    setComentario(solicitud.comentario_admin || "");
    setErrorRevision(null);
  }

  function cerrar() {
    setSeleccionada(null);
    setComentario("");
    setErrorRevision(null);
  }

  async function revisar(estado_solicitud) {
    if (estado_solicitud === "rechazada" && !comentario.trim()) {
      setErrorRevision("Escribe el motivo del rechazo para el solicitante.");
      return;
    }
    try {
      setRevisando(true);
      setErrorRevision(null);
      await apiFetch("solicitudes_publicacion.php", {
        method: "PUT",
        body: {
          accion: "revisar",
          id: seleccionada.id,
          estado_solicitud,
          comentario_admin: comentario.trim(),
        },
      });
      setMensaje({
        tipo: "ok",
        texto:
          estado_solicitud === "aprobada"
            ? `Solicitud de ${seleccionada.usuario} aprobada. Ya puede publicar ofertas.`
            : `Solicitud de ${seleccionada.usuario} rechazada.`,
      });
      cerrar();
      await cargar();
    } catch (err) {
      setErrorRevision(err.message || "No se pudo revisar la solicitud.");
    } finally {
      setRevisando(false);
    }
  }

  async function eliminar(solicitud) {
    setMensaje(null);
    try {
      await apiFetch(`solicitudes_publicacion.php?id=${solicitud.id}`, { method: "DELETE" });
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id));
      setMensaje({ tipo: "ok", texto: "Solicitud eliminada." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo eliminar la solicitud." });
    }
  }

  const esPendiente = seleccionada?.estado_solicitud === "pendiente";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-800">Buzón de solicitudes de publicación</h3>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {FILTROS.map((f) => (
            <button
              key={f.valor || "todas"}
              type="button"
              onClick={() => setFiltro(f.valor)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filtro === f.valor ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </div>

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {cargando && <Spinner texto="Cargando solicitudes..." />}
      {error && <MensajeError texto={`Error: ${error}`} />}
      {!cargando && !error && solicitudes.length === 0 && (
        <EstadoVacio
          titulo={filtro === "pendiente" ? "No hay solicitudes pendientes" : "Sin solicitudes"}
          mensaje={filtro === "pendiente" ? "Todo al día." : undefined}
        />
      )}

      {!cargando && solicitudes.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {solicitudes.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <button type="button" onClick={() => abrir(s)} className="min-w-0 flex-1 cursor-pointer text-left">
                <p className="truncate font-semibold text-slate-800">{s.nombre_organizacion_proyecto}</p>
                <p className="truncate text-xs text-slate-500">
                  {s.usuario} · {s.email} · {formatearFecha(s.fecha_solicitud)}
                </p>
              </button>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    COLOR_ESTADO_SOLICITUD[s.estado_solicitud] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {TEXTO_ESTADO_SOLICITUD[s.estado_solicitud] || s.estado_solicitud}
                </span>
                <button
                  type="button"
                  onClick={() => abrir(s)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {s.estado_solicitud === "pendiente" ? "Revisar" : "Ver"}
                </button>
                <BotonConfirmar texto="Eliminar" pregunta="¿Eliminar?" onConfirmar={() => eliminar(s)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {seleccionada && (
        <Modal onCerrar={cerrar} ancho="max-w-xl">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{seleccionada.nombre_organizacion_proyecto}</h3>
              <p className="text-sm text-slate-500">
                {seleccionada.usuario} · {seleccionada.email}
              </p>
              <p className="text-xs text-slate-400">Enviada el {formatearFecha(seleccionada.fecha_solicitud)}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción de actividades</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{seleccionada.descripcion_actividades}</p>
            </div>

            {seleccionada.documento_respaldo_url && (
              <a
                href={seleccionada.documento_respaldo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 underline hover:text-indigo-800"
              >
                📎 Ver documento de respaldo
              </a>
            )}

            {!esPendiente && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">
                    {TEXTO_ESTADO_SOLICITUD[seleccionada.estado_solicitud] || seleccionada.estado_solicitud}
                  </span>{" "}
                  por {seleccionada.revisado_por_nombre || "—"} el {formatearFecha(seleccionada.fecha_revision)}
                </p>
                {seleccionada.comentario_admin && (
                  <p className="mt-1 whitespace-pre-line text-xs">{seleccionada.comentario_admin}</p>
                )}
              </div>
            )}

            {esPendiente && (
              <>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Comentario para el solicitante (obligatorio si se rechaza)
                  <textarea
                    rows={3}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                {errorRevision && <MensajeError texto={errorRevision} />}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={revisando}
                    onClick={() => revisar("rechazada")}
                    className="cursor-pointer rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={revisando}
                    onClick={() => revisar("aprobada")}
                    className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {revisando ? "Guardando..." : "Aprobar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
