import { useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import HistorialModal from "./HistorialModal";
import PostulacionCard from "./PostulacionCard";
import PostularseForm from "./PostularseForm";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

export function MisPostulaciones() {
  const { usuario } = useContext(AuthContext);
  const usuarioId = usuario?.id;
  const [postulaciones, setPostulaciones] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }

  const [historialDe, setHistorialDe] = useState(null);
  const [editando, setEditando] = useState(null);

  const cargarPostulaciones = useCallback(
    async (signal) => {
      if (!usuarioId) return;
      try {
        setErrorCarga(null);
        const response = await apiFetch(`postulaciones.php?estudiante_id=${usuarioId}`, { signal });
        setPostulaciones(response.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [usuarioId]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargarPostulaciones(controller.signal);
    return () => controller.abort();
  }, [cargarPostulaciones]);

  async function retirar(postulacion) {
    setMensaje(null);
    try {
      await apiFetch(`postulaciones.php?id=${postulacion.id}`, { method: "DELETE" });
      setPostulaciones((prev) => prev.filter((p) => p.id !== postulacion.id));
      setMensaje({ tipo: "ok", texto: "Postulación retirada." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo retirar la postulación." });
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Mis postulaciones</h2>

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

      {cargando && <Spinner texto="Cargando postulaciones..." />}
      {errorCarga && <MensajeError texto={`Error: ${errorCarga}`} />}
      {!cargando && !errorCarga && postulaciones.length === 0 && (
        <EstadoVacio
          titulo="Aún no te has postulado"
          mensaje="Explora el Feed y postúlate a las prácticas que te interesen."
        />
      )}

      <div className="flex w-full flex-col gap-5">
        {postulaciones.map((po) => (
          <PostulacionCard
            key={po.id}
            postulacion={po}
            onVerHistorial={() => setHistorialDe(po)}
            onEditar={() => setEditando(po)}
            onRetirar={() => retirar(po)}
          />
        ))}
      </div>

      {historialDe && (
        <HistorialModal postulacion={historialDe} onCerrar={() => setHistorialDe(null)} />
      )}

      {editando && (
        <Modal onCerrar={() => setEditando(null)}>
          <PostularseForm
            postulacion={editando}
            onExito={() => {
              setEditando(null);
              cargarPostulaciones();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
