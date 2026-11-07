import { useCallback, useContext, useEffect, useState } from "react";
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

// Tamaño de página del feed (el backend acepta 1 a 50)
const POR_PAGINA = 10;
// Espera tras dejar de escribir antes de pedir al servidor
const ESPERA_BUSQUEDA_MS = 400;

export default function Feed() {
  const { usuario } = useContext(AuthContext);
  const roles = obtenerRoles(usuario);
  const esAdmin = Boolean(usuario?.isAdmin || roles.includes(ROL_ADMIN));
  const esReclutador = roles.includes(ROL_RECLUTADOR);
  const esEstudiante = roles.includes(ROL_ESTUDIANTE);

  const [oportunidades, setOportunidades] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  // false cuando la última página llegó incompleta (no hay más ofertas)
  const [hayMas, setHayMas] = useState(false);
  const [oportunidadSeleccionada, setOportunidadSeleccionada] = useState(null);

  // Filtro de ofertas propias para reclutador / admin
  const [soloMisOfertas, setSoloMisOfertas] = useState(false);

  // Estados de filtros (se aplican en el servidor)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [textoBuscado, setTextoBuscado] = useState(""); // filtroTexto con debounce
  const [filtroModalidad, setFiltroModalidad] = useState("");
  const [filtroCarrera, setFiltroCarrera] = useState("");

  // Catálogo de carreras para el select
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("carreras.php", { signal: controller.signal })
      .then((res) => setCarreras(res.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Debounce: no pedir al servidor en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setTextoBuscado(filtroTexto.trim()), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [filtroTexto]);

  // GET oportunidades.php?limit=&cursor=&q=&modalidad=&carrera_id=&solo_mias=
  const pedirPagina = useCallback(
    async (cursor, signal) => {
      const params = new URLSearchParams({ limit: String(POR_PAGINA) });
      if (cursor) params.set("cursor", String(cursor));
      if (textoBuscado) params.set("q", textoBuscado);
      if (filtroModalidad) params.set("modalidad", filtroModalidad);
      if (filtroCarrera) params.set("carrera_id", filtroCarrera);
      if (soloMisOfertas) params.set("solo_mias", "1");
      const res = await apiFetch(`oportunidades.php?${params}`, { signal });
      return res.data || [];
    },
    [textoBuscado, filtroModalidad, filtroCarrera, soloMisOfertas]
  );

  // Primera página: se recarga cada vez que cambia un filtro
  useEffect(() => {
    const controller = new AbortController();

    async function cargarPrimera() {
      try {
        setCargando(true);
        setErrorCarga(null);
        const pagina = await pedirPagina(0, controller.signal);
        setOportunidades(pagina);
        setHayMas(pagina.length === POR_PAGINA);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarPrimera();
    return () => controller.abort();
  }, [pedirPagina]);

  // Siguiente página: cursor = id de la última oferta mostrada (el feed va por id descendente)
  async function cargarMas() {
    const ultima = oportunidades[oportunidades.length - 1];
    if (!ultima) return;
    try {
      setCargandoMas(true);
      const pagina = await pedirPagina(ultima.id);
      setOportunidades((prev) => [...prev, ...pagina]);
      setHayMas(pagina.length === POR_PAGINA);
    } catch (err) {
      setErrorCarga(err.message);
    } finally {
      setCargandoMas(false);
    }
  }

  // Contador de filtros activos
  const totalFiltrosActivos =
    (filtroTexto.trim() ? 1 : 0) + (filtroModalidad ? 1 : 0) + (filtroCarrera ? 1 : 0);

  function limpiarFiltros() {
    setFiltroTexto("");
    setTextoBuscado("");
    setFiltroModalidad("");
    setFiltroCarrera("");
  }

  return (
    <div className="space-y-6">
      {/* Cabecera del Feed con botón de Filtros y conmutador de Mis Ofertas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Feed de Prácticas</h2>

          {/* Botón de Filtros */}
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition ${
              filtrosAbiertos || totalFiltrosActivos > 0
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>⚡ Filtros</span>
            {totalFiltrosActivos > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {totalFiltrosActivos}
              </span>
            )}
          </button>
        </div>

        {/* Filtro exclusivo de Mis Ofertas para Reclutador o Admin */}
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
              Todas
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
              Mis ofertas
            </button>
          </div>
        )}
      </div>

      {/* Panel colapsable de Filtros */}
      {filtrosAbiertos && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Filtros de Búsqueda
            </span>
            {totalFiltrosActivos > 0 && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 1. Palabra clave */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Palabra clave o tecnología
              </label>
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Ej: React, Banco, Remoto..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* 2. Modalidad */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Modalidad
              </label>
              <select
                value={filtroModalidad}
                onChange={(e) => setFiltroModalidad(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Todas las modalidades</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>

            {/* 3. Carrera */}
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Carrera objetivo
              </label>
              <select
                value={filtroCarrera}
                onChange={(e) => setFiltroCarrera(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Todas las carreras</option>
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.codigo ? `(${c.codigo})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-right text-xs text-slate-400">
            {cargando
              ? "Buscando..."
              : `${oportunidades.length}${hayMas ? "+" : ""} ofertas encontradas`}
          </div>
        </div>
      )}

      {cargando && <p className="text-slate-500">Cargando oportunidades...</p>}
      {errorCarga && <p className="text-red-500">Error: {errorCarga}</p>}

      {!cargando && oportunidades.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {totalFiltrosActivos > 0 ? (
            <div>
              <p>No se encontraron oportunidades que coincidan con los filtros aplicados.</p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Restablecer filtros
              </button>
            </div>
          ) : soloMisOfertas ? (
            "No has publicado ninguna oferta todavía. Ve a la pestaña 'Nueva Oferta' para crear una."
          ) : (
            "No hay oportunidades disponibles en este momento."
          )}
        </div>
      )}

      {/* Lista de tarjetas */}
      <div className="flex w-full flex-col gap-5">
        {oportunidades.map((op) => {
          const esPropia = Number(op.creado_por) === Number(usuario?.id);
          return (
            <div key={op.id} className="relative">
              {esPropia && (
                <div className="absolute right-25 top-6 z-10">
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

      {!cargando && hayMas && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargandoMas}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {cargandoMas ? "Cargando..." : "Cargar más ofertas"}
          </button>
        </div>
      )}

      {/* Modal con detalle y formulario según rol */}
      {oportunidadSeleccionada && (
        <DetalleModal
          oportunidad={oportunidadSeleccionada}
          onCerrar={() => setOportunidadSeleccionada(null)}
        >
          {/* Postulantes: solo el creador de la oferta o un admin (el backend también lo exige) */}
          {esAdmin || Number(oportunidadSeleccionada.creado_por) === Number(usuario?.id) ? (
            <GestionPostulantes oportunidad={oportunidadSeleccionada} />
          ) : esEstudiante ? (
            <PostularseForm
              oportunidad={oportunidadSeleccionada}
              onExito={() => setOportunidadSeleccionada(null)}
            />
          ) : null}
        </DetalleModal>
      )}
    </div>
  );
}
