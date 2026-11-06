import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import BotonConfirmar from "./ui/BotonConfirmar";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// CRUD genérico para catálogos simples (instituciones, carreras, roles).
// Usa el contrato estándar de los endpoints:
//   GET    <endpoint>            -> lista
//   POST   <endpoint>  {campos}  -> crear
//   PUT    <endpoint>  {id, ...} -> editar (se mandan todos los campos)
//   DELETE <endpoint>?id=X       -> eliminar
//
// Props:
//   titulo   -> texto de la cabecera
//   endpoint -> por ejemplo "carreras.php"
//   campos   -> [{ nombre, etiqueta, tipo: "text"|"email"|"url"|"select", requerido, opciones: [{valor, texto}] }]
//   columnas -> [{ etiqueta, valor: (fila) => texto }]
export default function CrudCatalogo({ titulo, endpoint, campos, columnas }) {
  const vacio = Object.fromEntries(campos.map((c) => [c.nombre, ""]));

  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [form, setForm] = useState(vacio);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(
    async (signal) => {
      try {
        setError(null);
        const res = await apiFetch(endpoint, { signal });
        setFilas(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message);
      } finally {
        if (!signal?.aborted) setCargando(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  function iniciarEdicion(fila) {
    setMensaje(null);
    setEditandoId(fila.id);
    setForm(Object.fromEntries(campos.map((c) => [c.nombre, fila[c.nombre] == null ? "" : String(fila[c.nombre])])));
  }

  function limpiar() {
    setEditandoId(null);
    setForm(vacio);
  }

  async function guardar(e) {
    e.preventDefault();
    setMensaje(null);

    const faltante = campos.find((c) => c.requerido && !String(form[c.nombre] || "").trim());
    if (faltante) {
      setMensaje({ tipo: "error", texto: `El campo "${faltante.etiqueta}" es obligatorio.` });
      return;
    }

    const cuerpo = Object.fromEntries(campos.map((c) => [c.nombre, String(form[c.nombre] || "").trim()]));

    try {
      setGuardando(true);
      if (editandoId) {
        await apiFetch(endpoint, { method: "PUT", body: { ...cuerpo, id: editandoId } });
        setMensaje({ tipo: "ok", texto: "Registro actualizado." });
      } else {
        await apiFetch(endpoint, { method: "POST", body: cuerpo });
        setMensaje({ tipo: "ok", texto: "Registro creado." });
      }
      limpiar();
      await cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo guardar." });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(fila) {
    setMensaje(null);
    try {
      await apiFetch(`${endpoint}?id=${fila.id}`, { method: "DELETE" });
      setFilas((prev) => prev.filter((f) => f.id !== fila.id));
      if (editandoId === fila.id) limpiar();
      setMensaje({ tipo: "ok", texto: "Registro eliminado." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo eliminar." });
    }
  }

  const claseInput =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>

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

      {/* Formulario de alta / edición */}
      <form onSubmit={guardar} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" noValidate>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {editandoId ? "Editar registro" : "Nuevo registro"}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campos.map((c) => (
            <label key={c.nombre} className="block text-xs font-medium text-slate-600">
              {c.etiqueta} {c.requerido && <span className="text-red-500">*</span>}
              {c.tipo === "select" ? (
                <select
                  value={form[c.nombre]}
                  onChange={(e) => setForm((p) => ({ ...p, [c.nombre]: e.target.value }))}
                  className={claseInput}
                >
                  <option value="">Selecciona...</option>
                  {(c.opciones || []).map((o) => (
                    <option key={o.valor} value={o.valor}>{o.texto}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.tipo || "text"}
                  value={form[c.nombre]}
                  onChange={(e) => setForm((p) => ({ ...p, [c.nombre]: e.target.value }))}
                  className={claseInput}
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {editandoId && (
            <button
              type="button"
              onClick={limpiar}
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={guardando}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear"}
          </button>
        </div>
      </form>

      {cargando && <Spinner texto="Cargando..." />}
      {error && <MensajeError texto={`Error: ${error}`} />}
      {!cargando && !error && filas.length === 0 && <EstadoVacio titulo="Sin registros" />}

      {!cargando && filas.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columnas.map((col) => (
                  <th key={col.etiqueta} className="px-4 py-3">{col.etiqueta}</th>
                ))}
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((fila) => (
                <tr key={fila.id}>
                  {columnas.map((col) => (
                    <td key={col.etiqueta} className="px-4 py-3 text-slate-700">{col.valor(fila) || "—"}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(fila)}
                        className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <BotonConfirmar texto="Eliminar" onConfirmar={() => eliminar(fila)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
