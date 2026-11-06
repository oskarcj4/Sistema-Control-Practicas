import { useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ESTADO_OPORTUNIDAD,
  COLOR_MODALIDAD,
  TEXTO_ESTADO_OPORTUNIDAD,
  TEXTO_MODALIDAD,
  formatearFecha,
} from "../helpers/estilos";
import DetalleModal from "./DetalleModal";
import GestionPostulantes from "./GestionPostulantes";
import NuevaOfertaForm from "./NuevaOfertaForm";
import BotonConfirmar from "./ui/BotonConfirmar";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

// Ofertas publicadas por el usuario logueado (GET oportunidades.php?creado_por=X).
// Incluye cerradas y canceladas, a diferencia del Feed que solo muestra activas.
// Acciones: ver postulantes, editar, cerrar / reabrir, cancelar y eliminar.
export default function MisOfertas({ onNuevaOferta }) {
  const { usuario } = useContext(AuthContext);
  const usuarioId = usuario?.id;
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [editando, setEditando] = useState(null);
  const [verPostulantes, setVerPostulantes] = useState(null);
  const [procesandoId, setProcesandoId] = useState(null);

  const cargar = useCallback(
    async (signal) => {
      if (!usuarioId) return;
      try {
        setError(null);
        const res = await apiFetch(`oportunidades.php?creado_por=${usuarioId}`, { signal });
        setOfertas(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [usuarioId]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  // PUT exige todos los campos: se reenvía la oferta completa con el estado nuevo
  async function cambiarEstado(oferta, estado_oportunidad) {
    setMensaje(null);
    setProcesandoId(oferta.id);
    try {
      await apiFetch("oportunidades.php", {
        method: "PUT",
        body: {
          id: oferta.id,
          titulo: oferta.titulo,
          descripcion: oferta.descripcion,
          requisitos: oferta.requisitos || "",
          institucion_id: oferta.institucion_id,
          carrera_id: oferta.carrera_id,
          modalidad: oferta.modalidad,
          ubicacion: oferta.ubicacion || "",
          fecha_publicacion: String(oferta.fecha_publicacion || "").slice(0, 10),
          fecha_cierre: String(oferta.fecha_cierre || "").slice(0, 10),
          estado_oportunidad,
          visto: Number(oferta.visto) === 1 ? 1 : 0,
        },
      });
      setOfertas((prev) => prev.map((o) => (o.id === oferta.id ? { ...o, estado_oportunidad } : o)));
      setMensaje({ tipo: "ok", texto: `Oferta marcada como "${TEXTO_ESTADO_OPORTUNIDAD[estado_oportunidad]}".` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo cambiar el estado." });
    } finally {
      setProcesandoId(null);
    }
  }

  async function eliminar(oferta) {
    setMensaje(null);
    try {
      await apiFetch(`oportunidades.php?id=${oferta.id}`, { method: "DELETE" });
      setOfertas((prev) => prev.filter((o) => o.id !== oferta.id));
      setMensaje({ tipo: "ok", texto: "Oferta eliminada." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo eliminar la oferta." });
    }
  }

  const botonSecundario =
    "cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Mis ofertas</h2>
        {onNuevaOferta && (
          <button
            type="button"
            onClick={onNuevaOferta}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Nueva oferta
          </button>
        )}
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

      {cargando && <Spinner texto="Cargando tus ofertas..." />}
      {error && <MensajeError texto={`Error: ${error}`} />}
      {!cargando && !error && ofertas.length === 0 && (
        <EstadoVacio titulo="No has publicado ofertas" mensaje="Crea tu primera convocatoria de prácticas." />
      )}

      <div className="flex flex-col gap-4">
        {ofertas.map((o) => {
          const estado = o.estado_oportunidad;
          const ocupado = procesandoId === o.id;
          return (
            <article key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800">{o.titulo}</h3>
                  <p className="text-sm text-slate-500">
                    {o.institucion || "Sin institución"} · Cierra {formatearFecha(o.fecha_cierre)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLOR_MODALIDAD[o.modalidad] || "bg-slate-100 text-slate-700"}`}>
                    {TEXTO_MODALIDAD[o.modalidad] || o.modalidad}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLOR_ESTADO_OPORTUNIDAD[estado] || "bg-slate-100 text-slate-700"}`}>
                    {TEXTO_ESTADO_OPORTUNIDAD[estado] || estado}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setVerPostulantes(o)} className={botonSecundario}>
                  Ver postulantes
                </button>
                <button type="button" onClick={() => setEditando(o)} className={botonSecundario}>
                  Editar
                </button>
                {estado === "activa" && (
                  <button type="button" disabled={ocupado} onClick={() => cambiarEstado(o, "cerrada")} className={botonSecundario}>
                    Cerrar convocatoria
                  </button>
                )}
                {estado !== "activa" && (
                  <button type="button" disabled={ocupado} onClick={() => cambiarEstado(o, "activa")} className={botonSecundario}>
                    Reabrir
                  </button>
                )}
                {estado !== "cancelada" && (
                  <BotonConfirmar
                    texto="Cancelar oferta"
                    pregunta="¿Cancelar oferta?"
                    deshabilitado={ocupado}
                    onConfirmar={() => cambiarEstado(o, "cancelada")}
                    clase="cursor-pointer rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                  />
                )}
                <BotonConfirmar texto="Eliminar" pregunta="¿Eliminar definitivamente?" onConfirmar={() => eliminar(o)} />
              </div>
            </article>
          );
        })}
      </div>

      {editando && (
        <Modal onCerrar={() => setEditando(null)} ancho="max-w-3xl">
          <NuevaOfertaForm
            oportunidad={editando}
            onCancelar={() => setEditando(null)}
            onOfertaCreada={() => {
              setEditando(null);
              setMensaje({ tipo: "ok", texto: "Oferta actualizada correctamente." });
              cargar();
            }}
          />
        </Modal>
      )}

      {verPostulantes && (
        <DetalleModal oportunidad={verPostulantes} onCerrar={() => setVerPostulantes(null)}>
          <GestionPostulantes oportunidad={verPostulantes} />
        </DetalleModal>
      )}
    </div>
  );
}
