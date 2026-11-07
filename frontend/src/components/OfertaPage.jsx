import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { enlaceCompleto, irA } from "../helpers/rutas";
import AccionesOferta from "./AccionesOferta";
import DetalleOferta from "./DetalleOferta";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Página propia de una oferta: #/oferta/<id>. Se puede compartir el enlace y
// las notificaciones de postulaciones abren aquí.
//   GET oportunidades.php?id=X  (incluye mi_postulacion del usuario de la sesión)
export default function OfertaPage({ id }) {
  const [oportunidad, setOportunidad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(
    async (signal) => {
      try {
        setCargando(true);
        setError(null);
        const res = await apiFetch(`oportunidades.php?id=${id}`, { signal });
        setOportunidad(res.data || null);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "No se pudo cargar la oferta.");
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(enlaceCompleto(`#/oferta/${id}`));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la URL ya está en la barra del navegador
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? window.history.back() : irA("#/feed"))}
          className="cursor-pointer text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Volver
        </button>
        {oportunidad && (
          <button
            type="button"
            onClick={copiarEnlace}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copiado ? "✓ Enlace copiado" : "🔗 Copiar enlace"}
          </button>
        )}
      </div>

      {cargando && <Spinner texto="Cargando oferta..." />}
      {error && <MensajeError texto={error} />}

      {!cargando && oportunidad && (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <DetalleOferta oportunidad={oportunidad}>
            <AccionesOferta
              oportunidad={oportunidad}
              onPostulado={() => setOportunidad((o) => ({ ...o, mi_postulacion: "pendiente" }))}
            />
          </DetalleOferta>
        </article>
      )}
    </div>
  );
}
