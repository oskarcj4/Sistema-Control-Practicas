import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import {
  ROL_ADMIN,
  ROL_ESTUDIANTE,
  ROL_RECLUTADOR,
  obtenerRoles,
} from "../helpers/estilos";
import DetalleModal from "./DetalleModal";
import GestionPostulantes from "./GestionPostulantes";
import OportunidadCard from "./OportunidadCard";
import PostularseForm from "./PostularseForm";

export default function Feed() {
  const { usuario } = useContext(AuthContext);
  const roles = obtenerRoles(usuario);
  const esAdmin = Boolean(usuario?.isAdmin || roles.includes(ROL_ADMIN));
  const esReclutador = roles.includes(ROL_RECLUTADOR);
  const esEstudiante = roles.includes(ROL_ESTUDIANTE);

  const [oportunidades, setOportunidades] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);
  const [soloMisOfertas, setSoloMisOfertas] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function cargarFeed() {
      try {
        setCargando(true);
        setErrorCarga(null);
        const response = await apiFetch("oportunidades.php", { signal: controller.signal });
        setOportunidades(response.data || []);
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

  const ofertasVisibles = soloMisOfertas
    ? oportunidades.filter((op) => Number(op.creado_por) === Number(usuario?.id))
    : oportunidades;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Feed de Prácticas</h2>

        {/* Filtro para que el Reclutador o Admin pueda ver exclusivamente las que él publicó */}
        {(esReclutador || esAdmin) && (
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setSoloMisOfertas(false)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                !soloMisOfertas
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas las ofertas ({oportunidades.length})
            </button>
            <button
              type="button"
              onClick={() => setSoloMisOfertas(true)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                soloMisOfertas
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mis ofertas publicadas (
              {oportunidades.filter((op) => Number(op.creado_por) === Number(usuario?.id)).length})
            </button>
          </div>
        )}
      </div>

      {cargando && <p className="text-slate-500">Cargando oportunidades...</p>}
      {errorCarga && <p className="text-red-500">Error: {errorCarga}</p>}

      {!cargando && ofertasVisibles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {soloMisOfertas
            ? "No has publicado ninguna oferta todavía. Ve a la pestaña 'Nueva Oferta' para crear una."
            : "No hay oportunidades disponibles en este momento."}
        </div>
      )}

      <div className="flex w-full flex-col gap-5">
        {ofertasVisibles.map((op) => {
          const esPropia = Number(op.creado_por) === Number(usuario?.id);
          return (
            <div key={op.id} className="relative">
              {esPropia && (
                <div className="absolute right-30 top-6 z-10">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    Tu publicación
                  </span>
                </div>
              )}
              <OportunidadCard
                oportunidad={op}
                onVerMas={() => setOportunidadSeleccionada(op)}
              />
            </div>
          );
        })}
      </div>

      {oportunidadSeleccionada && (
        <DetalleModal
          oportunidad={oportunidadSeleccionada}
          onCerrar={() => setOportunidadSeleccionada(null)}
        >
          {esEstudiante ? (
            <PostularseForm
              oportunidad={oportunidadSeleccionada}
              onExito={() => setOportunidadSeleccionada(null)}
            />
          ) : (
            <GestionPostulantes
              oportunidad={oportunidadSeleccionada}
              usuario={usuario}
            />
          )}
        </DetalleModal>
      )}
    </div>
  );
}
