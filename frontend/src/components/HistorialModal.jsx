import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import HistorialTimeline from "./HistorialTimeline";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

// Carga GET historial_estado_postulacion.php?postulacion_id=X y lo dibuja con HistorialTimeline.
// El backend solo lo entrega al estudiante dueño, al creador de la oferta o a un admin.
//
// Props:
//   postulacion -> { id, oportunidad?, estudiante? }. Si es null no se dibuja.
//   onCerrar    -> función que cierra el modal
export default function HistorialModal({ postulacion, onCerrar }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!postulacion?.id) return;
    const controller = new AbortController();

    async function cargar() {
      try {
        setCargando(true);
        setError(null);
        const res = await apiFetch(
          `historial_estado_postulacion.php?postulacion_id=${postulacion.id}`,
          { signal: controller.signal }
        );
        setHistorial(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "No se pudo cargar el historial.");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    cargar();
    return () => controller.abort();
  }, [postulacion?.id]);

  if (!postulacion) return null;

  const subtitulo = postulacion.oportunidad || postulacion.estudiante;

  return (
    <Modal titulo="Historial de la postulación" onCerrar={onCerrar} ancho="max-w-lg">
      {subtitulo && <p className="-mt-2 mb-4 text-sm text-slate-500">{subtitulo}</p>}
      {cargando && <Spinner texto="Cargando historial..." />}
      {error && <MensajeError texto={error} />}
      {!cargando && !error && <HistorialTimeline historial={historial} />}
    </Modal>
  );
}
