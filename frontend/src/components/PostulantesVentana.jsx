import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import {
  COLOR_ESTADO_POSTULACION,
  TEXTO_ESTADO_POSTULACION,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";
import HistorialTimeline from "./HistorialTimeline";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Ventana grande para gestionar los postulantes de UNA oferta (Mis Ofertas).
// Izquierda: lista de postulantes con búsqueda y filtro por estado.
// Derecha: detalle completo de la postulación seleccionada (datos, mensaje,
// documentos con vista previa, historial) y acciones de cambio de estado.
// En celular se ve una columna a la vez, con botón para volver a la lista.
//
//   GET postulaciones.php?oportunidad_id=X
//   GET historial_estado_postulacion.php?postulacion_id=X
//   PUT postulaciones.php { accion: "estado", id, estado_postulacion, comentario }
//       (el backend guarda historial y notifica al estudiante)
//
// Props:
//   oportunidad -> la oferta
//   onCerrar    -> cierra la ventana

const FILTROS = [
  { valor: "", texto: "Todos" },
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "en_revision", texto: "En revisión" },
  { valor: "aceptada", texto: "Aceptados" },
  { valor: "rechazada", texto: "Rechazados" },
];

// Acciones disponibles y mensaje sugerido para el estudiante
const ACCIONES = {
  en_revision: {
    texto: "Marcar en revisión",
    clase: "bg-blue-600 hover:bg-blue-700",
    mensaje: (titulo) => `Tu postulación para "${titulo}" está siendo revisada.`,
  },
  aceptada: {
    texto: "Aceptar",
    clase: "bg-green-600 hover:bg-green-700",
    mensaje: (titulo) =>
      `¡Felicidades! Has sido seleccionado para la práctica "${titulo}". Nos comunicaremos pronto.`,
  },
  rechazada: {
    texto: "Rechazar",
    clase: "bg-red-600 hover:bg-red-700",
    mensaje: (titulo) =>
      `Gracias por tu interés en la vacante "${titulo}". En esta ocasión hemos decidido continuar con otros perfiles.`,
  },
};

function esPdf(url) {
  return /\.pdf($|\?)/i.test(url || "");
}

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{etiqueta}</dt>
      <dd className="text-sm text-slate-800">{valor || "—"}</dd>
    </div>
  );
}

export default function PostulantesVentana({ oportunidad, onCerrar }) {
  const [postulantes, setPostulantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [filtro, setFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Documento abierto en la vista previa: "cv" | "constancia" | null
  const [documento, setDocumento] = useState(null);

  // Cambio de estado en curso
  const [accion, setAccion] = useState(null);
  const [comentario, setComentario] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const oportunidadId = oportunidad?.id;

  const cargar = useCallback(
    async (signal) => {
      try {
        setError(null);
        const res = await apiFetch(`postulaciones.php?oportunidad_id=${oportunidadId}`, { signal });
        setPostulantes(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Error al cargar postulantes.");
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [oportunidadId]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  const cargarHistorial = useCallback(async (postulacionId, signal) => {
    try {
      setCargandoHistorial(true);
      const res = await apiFetch(`historial_estado_postulacion.php?postulacion_id=${postulacionId}`, { signal });
      setHistorial(res.data || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setHistorial([]);
    } finally {
      if (!signal?.aborted) setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    if (!seleccionadaId) return;
    const controller = new AbortController();
    cargarHistorial(seleccionadaId, controller.signal);
    return () => controller.abort();
  }, [seleccionadaId, cargarHistorial]);

  // Escape cierra la ventana
  useEffect(() => {
    function alPresionar(e) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  function seleccionar(p) {
    setSeleccionadaId(p.id);
    setDocumento(null);
    setAccion(null);
    setMensaje(null);
  }

  function iniciarAccion(estado) {
    setAccion(estado);
    setComentario(ACCIONES[estado].mensaje(oportunidad.titulo));
    setMensaje(null);
  }

  async function confirmarAccion(e) {
    e.preventDefault();
    try {
      setProcesando(true);
      await apiFetch("postulaciones.php", {
        method: "PUT",
        body: { accion: "estado", id: seleccionadaId, estado_postulacion: accion, comentario: comentario.trim() },
      });
      setMensaje({
        tipo: "ok",
        texto: `Postulación marcada como "${TEXTO_ESTADO_POSTULACION[accion]}". El estudiante fue notificado.`,
      });
      setAccion(null);
      setPostulantes((prev) => prev.map((p) => (p.id === seleccionadaId ? { ...p, estado_postulacion: accion } : p)));
      await cargarHistorial(seleccionadaId);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo cambiar el estado." });
    } finally {
      setProcesando(false);
    }
  }

  // Conteo por estado para las pestañas de filtro
  const conteo = postulantes.reduce((acc, p) => {
    acc[p.estado_postulacion] = (acc[p.estado_postulacion] || 0) + 1;
    return acc;
  }, {});

  const termino = busqueda.trim().toLowerCase();
  const visibles = postulantes.filter((p) => {
    if (filtro && p.estado_postulacion !== filtro) return false;
    if (!termino) return true;
    return [p.estudiante, p.email, p.carnet, p.carrera].some((v) => (v || "").toLowerCase().includes(termino));
  });

  const seleccionada = postulantes.find((p) => p.id === seleccionadaId) || null;
  const urlDocumento =
    documento === "cv" ? seleccionada?.cv_url : documento === "constancia" ? seleccionada?.constancia_estudios_url : null;

  return (
    <div onClick={onCerrar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Postulantes de ${oportunidad.titulo}`}
        className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Postulantes</p>
            <h2 className="truncate text-xl font-bold text-slate-900">{oportunidad.titulo}</h2>
            <p className="truncate text-xs text-slate-500">
              {oportunidad.institucion || "Sin institución"} · {TEXTO_MODALIDAD[oportunidad.modalidad] || oportunidad.modalidad} ·
              Cierra {formatearFecha(oportunidad.fecha_cierre)} · {postulantes.length} postulaciones
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* Lista */}
          <aside
            className={`flex w-full min-w-0 flex-col border-r border-slate-200 md:w-80 md:shrink-0 ${
              seleccionada ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="space-y-2 border-b border-slate-100 p-3">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar nombre, email, carnet..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1">
                {FILTROS.map((f) => {
                  const n = f.valor ? conteo[f.valor] || 0 : postulantes.length;
                  return (
                    <button
                      key={f.valor || "todos"}
                      type="button"
                      onClick={() => setFiltro(f.valor)}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        filtro === f.valor ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f.texto} {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {cargando && <div className="p-4"><Spinner texto="Cargando postulantes..." /></div>}
              {error && <div className="p-4"><MensajeError texto={error} /></div>}
              {!cargando && !error && visibles.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-400">
                  {postulantes.length === 0 ? "Aún no hay postulaciones para esta oferta." : "Ningún postulante coincide."}
                </p>
              )}
              <ul className="divide-y divide-slate-100">
                {visibles.map((p) => {
                  const activa = p.id === seleccionadaId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => seleccionar(p)}
                        className={`block w-full cursor-pointer px-4 py-3 text-left transition ${
                          activa ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`truncate text-sm ${activa ? "font-bold text-indigo-800" : "font-semibold text-slate-800"}`}>
                            {p.estudiante}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              COLOR_ESTADO_POSTULACION[p.estado_postulacion] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {TEXTO_ESTADO_POSTULACION[p.estado_postulacion] || p.estado_postulacion}
                          </span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{p.carrera || "Sin carrera"}</p>
                        <p className="text-xs text-slate-400">{formatearFecha(p.fecha_postulacion)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Detalle */}
          <section className={`min-w-0 flex-1 overflow-y-auto ${seleccionada ? "block" : "hidden md:block"}`}>
            {!seleccionada ? (
              <div className="flex h-full items-center justify-center p-6">
                <EstadoVacio icono="👈" titulo="Selecciona un postulante" mensaje="Verás su información, documentos e historial." />
              </div>
            ) : (
              <div className="space-y-6 p-5">
                <button
                  type="button"
                  onClick={() => setSeleccionadaId(null)}
                  className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline md:hidden"
                >
                  ← Volver a la lista
                </button>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{seleccionada.estudiante}</h3>
                    <a href={`mailto:${seleccionada.email}`} className="text-sm text-indigo-600 hover:underline">
                      {seleccionada.email}
                    </a>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      COLOR_ESTADO_POSTULACION[seleccionada.estado_postulacion] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {TEXTO_ESTADO_POSTULACION[seleccionada.estado_postulacion] || seleccionada.estado_postulacion}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <Dato etiqueta="Carrera" valor={seleccionada.carrera} />
                  <Dato etiqueta="Carnet" valor={seleccionada.carnet} />
                  <Dato etiqueta="Edad" valor={seleccionada.edad ? `${seleccionada.edad} años` : null} />
                  <Dato etiqueta="Ciclo" valor={seleccionada.ciclo_universitario} />
                  <Dato etiqueta="Postulado el" valor={formatearFecha(seleccionada.fecha_postulacion)} />
                </dl>

                <div>
                  <h4 className="text-sm font-bold text-slate-700">Mensaje de presentación</h4>
                  <p className="mt-1 whitespace-pre-line rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    {seleccionada.mensaje_presentacion || <span className="text-slate-400">Sin mensaje.</span>}
                  </p>
                </div>

                {/* Documentos con vista previa */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700">Documentos</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { id: "cv", texto: "CV", url: seleccionada.cv_url },
                      { id: "constancia", texto: "Constancia de estudios", url: seleccionada.constancia_estudios_url },
                    ]
                      .filter((d) => d.url)
                      .map((d) => (
                        <div key={d.id} className="flex overflow-hidden rounded-lg border border-slate-300">
                          <button
                            type="button"
                            onClick={() => setDocumento(documento === d.id ? null : d.id)}
                            className={`cursor-pointer px-3 py-1.5 text-xs font-medium ${
                              documento === d.id ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {documento === d.id ? "Ocultar" : "Ver"} {d.texto}
                          </button>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="border-l border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                            title="Abrir en otra pestaña"
                          >
                            ↗
                          </a>
                        </div>
                      ))}
                  </div>
                  {urlDocumento && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {esPdf(urlDocumento) ? (
                        <iframe src={urlDocumento} title="Vista previa del documento" className="h-[60vh] w-full" />
                      ) : (
                        <img src={urlDocumento} alt="Vista previa del documento" className="mx-auto max-h-[60vh]" />
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-sm font-bold text-slate-700">Cambiar estado</h4>
                  {mensaje && (
                    <div
                      className={`mt-2 rounded-lg p-3 text-sm font-medium ${
                        mensaje.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {mensaje.texto}
                    </div>
                  )}
                  {!accion ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(ACCIONES)
                        .filter(([estado]) => estado !== seleccionada.estado_postulacion)
                        .map(([estado, a]) => (
                          <button
                            key={estado}
                            type="button"
                            onClick={() => iniciarAccion(estado)}
                            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-white ${a.clase}`}
                          >
                            {a.texto}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <form onSubmit={confirmarAccion} className="mt-3 space-y-3">
                      <p className="text-xs text-slate-600">
                        Mensaje para el estudiante (llega a su buzón y queda en el historial):
                      </p>
                      <textarea
                        rows={3}
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => setAccion(null)}
                          className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={procesando}
                          className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${ACCIONES[accion].clase}`}
                        >
                          {procesando ? "Guardando..." : `Confirmar: ${ACCIONES[accion].texto}`}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-bold text-slate-700">Historial</h4>
                  {cargandoHistorial ? <Spinner texto="Cargando historial..." /> : <HistorialTimeline historial={historial} />}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
