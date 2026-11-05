import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import DetalleModal from "./DetalleModal";
import OportunidadCard from "./OportunidadCard";
import PostularseForm from "./PostularseForm";

export default function Feed() {
  const [oportunidades, setOportunidades] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function cargarFeed() {
      try {
        const response = await apiFetch("oportunidades.php", { signal: controller.signal });
        setOportunidades(response.data);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarFeed();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Feed de Prácticas</h2>
      {cargando && <p className="text-slate-500">Cargando oportunidades...</p>}
      {errorCarga && <p className="text-red-500">Error: {errorCarga}</p>}

      {!cargando && oportunidades.length === 0 && (
        <p className="text-slate-500">No hay oportunidades disponibles en este momento.</p>
      )}

      <div className="flex w-full flex-col gap-5">
        {oportunidades.map((op) => (
          <OportunidadCard
            key={op.id}
            oportunidad={op}
            onVerMas={() => setOportunidadSeleccionada(op)}
          />
        ))}
      </div>

      {oportunidadSeleccionada && (
        <DetalleModal
          oportunidad={oportunidadSeleccionada}
          onCerrar={() => setOportunidadSeleccionada(null)}
        >
          <PostularseForm
            oportunidad={oportunidadSeleccionada}
            onExito={() => setOportunidadSeleccionada(null)}
          />
        </DetalleModal>
      )}
    </div>
  );
}
