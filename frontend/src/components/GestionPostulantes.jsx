import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import HistorialModal from "./HistorialModal";
import TablaPostulantes from "./TablaPostulantes";

export default function GestionPostulantes({ oportunidad }) {
  const [postulantes, setPostulantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Modal para confirmar estado y enviar mensaje/notificación
  const [postulacionAccion, setPostulacionAccion] = useState(null); // { postulacion, nuevoEstado: 'aceptada' | 'rechazada' }
  const [comentario, setComentario] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [historialDe, setHistorialDe] = useState(null);

  async function cargarPostulantes() {
    try {
      setCargando(true);
      setError(null);
      const res = await apiFetch(`postulaciones.php?oportunidad_id=${oportunidad.id}`);
      setPostulantes(res.data || []);
    } catch (err) {
      setError(err.message || "Error al cargar postulantes.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (oportunidad?.id) {
      cargarPostulantes();
    }
  }, [oportunidad?.id]);

  function handleIniciarAccion(postulacion, nuevoEstado) {
    setPostulacionAccion({ postulacion, nuevoEstado });
    setComentario(
      nuevoEstado === "aceptada"
        ? `¡Felicidades! Has sido seleccionado para la práctica "${oportunidad.titulo}". Nos comunicaremos pronto.`
        : `Gracias por tu interés en la vacante "${oportunidad.titulo}". En esta ocasión hemos decidido continuar con otros perfiles.`
    );
  }

  async function handleConfirmarAccion(e) {
    e.preventDefault();
    if (!postulacionAccion) return;

    try {
      setProcesando(true);
      const { postulacion, nuevoEstado } = postulacionAccion;

      // Cambia el estado. El backend guarda el historial y notifica al estudiante
      // (actualizado_por sale de la sesión).
      await apiFetch("postulaciones.php", {
        method: "PUT",
        body: {
          accion: "estado",
          id: postulacion.id,
          estado_postulacion: nuevoEstado,
          comentario: comentario.trim(),
        },
      });

      setMensaje({
        tipo: "ok",
        texto: `Postulación marcada como "${nuevoEstado}" y notificación enviada al estudiante con éxito.`,
      });
      setPostulacionAccion(null);
      setComentario("");

      // Recargar lista
      await cargarPostulantes();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "Error al procesar la acción." });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Postulantes Recibidos</h3>
          <p className="text-xs text-slate-500">
            Revisa a los estudiantes postulados y notifícales el resultado.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarPostulantes}
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          🔄 Actualizar
        </button>
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

      {/* Modal / Card para confirmar y escribir mensaje */}
      {postulacionAccion && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
          <h4 className="font-bold text-slate-800">
            {postulacionAccion.nuevoEstado === "aceptada" ? "✅ Aceptar" : "❌ Rechazar"} postulación
            de {postulacionAccion.postulacion.estudiante}
          </h4>
          <p className="mt-1 text-xs text-slate-600">
            Escribe un mensaje explicativo. Este mensaje llegará inmediatamente a la campana de
            notificaciones del estudiante.
          </p>

          <form onSubmit={handleConfirmarAccion} className="mt-3 space-y-3">
            <textarea
              rows={3}
              required
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe el mensaje o motivo aquí..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={procesando}
                onClick={() => setPostulacionAccion(null)}
                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesando}
                className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
                  postulacionAccion.nuevoEstado === "aceptada"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {procesando ? "Enviando..." : "Confirmar y Notificar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando && <p className="text-sm text-slate-500">Cargando candidatos...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!cargando && postulantes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          Aún no hay postulaciones para esta oportunidad.
        </div>
      )}

      {!cargando && postulantes.length > 0 && (
        <TablaPostulantes
          postulantes={postulantes}
          onAceptar={(p) => handleIniciarAccion(p, "aceptada")}
          onRechazar={(p) => handleIniciarAccion(p, "rechazada")}
          onVerHistorial={(p) => setHistorialDe(p)}
        />
      )}

      {historialDe && (
        <HistorialModal postulacion={historialDe} onCerrar={() => setHistorialDe(null)} />
      )}
    </div>
  );
}
