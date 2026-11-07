import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Visor de la bitácora (solo admin). La llena api/core/audit-log.php en cada
// INSERT/UPDATE/DELETE.
//   GET bitacora.php?tablas=1                                -> tablas para el filtro
//   GET bitacora.php?tabla=&usuario=&accion=&cursor=&limit=  -> registros (id descendente)
const POR_PAGINA = 30;

const COLOR_ACCION = {
  INSERT: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-sky-100 text-sky-700",
  DELETE: "bg-rose-100 text-rose-700",
};

const TEXTO_ACCION = { INSERT: "Alta", UPDATE: "Cambio", DELETE: "Borrado" };

export default function Bitacora() {
  const [tablas, setTablas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null); // id del registro con el detalle visible

  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [usuarioTexto, setUsuarioTexto] = useState("");
  const [usuarioBuscado, setUsuarioBuscado] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("bitacora.php?tablas=1", { signal: controller.signal })
      .then((res) => setTablas(res.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setUsuarioBuscado(usuarioTexto.trim()), 400);
    return () => clearTimeout(t);
  }, [usuarioTexto]);

  const pedirPagina = useCallback(
    async (cursor, signal) => {
      const params = new URLSearchParams({ limit: String(POR_PAGINA) });
      if (cursor) params.set("cursor", String(cursor));
      if (tabla) params.set("tabla", tabla);
      if (accion) params.set("accion", accion);
      if (usuarioBuscado) params.set("usuario", usuarioBuscado);
      const res = await apiFetch(`bitacora.php?${params}`, { signal });
      return res.data || [];
    },
    [tabla, accion, usuarioBuscado]
  );

  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      try {
        setCargando(true);
        setError(null);
        const pagina = await pedirPagina(0, controller.signal);
        setRegistros(pagina);
        setHayMas(pagina.length === POR_PAGINA);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "No se pudo cargar la bitácora.");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    cargar();
    return () => controller.abort();
  }, [pedirPagina]);

  async function cargarMas() {
    const ultimo = registros[registros.length - 1];
    if (!ultimo) return;
    try {
      setCargandoMas(true);
      const pagina = await pedirPagina(ultimo.id);
      setRegistros((prev) => [...prev, ...pagina]);
      setHayMas(pagina.length === POR_PAGINA);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoMas(false);
    }
  }

  const claseFiltro =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Bitácora</h2>
        <p className="text-sm text-slate-500">
          Cada alta, cambio o borrado en la base de datos, con el usuario que lo hizo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={tabla} onChange={(e) => setTabla(e.target.value)} className={claseFiltro}>
          <option value="">Todas las tablas</option>
          {tablas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={accion} onChange={(e) => setAccion(e.target.value)} className={claseFiltro}>
          <option value="">Todas las acciones</option>
          {Object.entries(TEXTO_ACCION).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={usuarioTexto}
          onChange={(e) => setUsuarioTexto(e.target.value)}
          placeholder="Usuario..."
          className={`${claseFiltro} w-40`}
        />
      </div>

      {cargando && <Spinner texto="Cargando bitácora..." />}
      {error && <MensajeError texto={error} />}
      {!cargando && !error && registros.length === 0 && (
        <EstadoVacio icono="📜" titulo="Sin registros" mensaje="No hay movimientos con esos filtros." />
      )}

      {!cargando && registros.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Tabla</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registros.map((r) => (
                <FilaBitacora
                  key={r.id}
                  registro={r}
                  abierto={abierto === r.id}
                  onAlternar={() => setAbierto(abierto === r.id ? null : r.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && hayMas && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={cargarMas}
            disabled={cargandoMas}
            className="cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cargandoMas ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}
    </div>
  );
}

function FilaBitacora({ registro, abierto, onAlternar }) {
  const fecha = String(registro.fecha || "").replace("T", " ").slice(0, 16);
  return (
    <>
      <tr className={abierto ? "bg-slate-50" : ""}>
        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{fecha}</td>
        <td className="px-4 py-2.5 font-medium text-slate-800">{registro.usuario}</td>
        <td className="px-4 py-2.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              COLOR_ACCION[registro.accion] || "bg-slate-100 text-slate-700"
            }`}
          >
            {TEXTO_ACCION[registro.accion] || registro.accion}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{registro.tabla}</td>
        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
          {registro.registro_id === "multiple" ? "—" : registro.registro_id}
        </td>
        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={onAlternar}
            className="cursor-pointer text-xs font-semibold text-indigo-600 hover:underline"
          >
            {abierto ? "Ocultar" : "Ver datos"}
          </button>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 pb-4">
            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(registro.datos, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
