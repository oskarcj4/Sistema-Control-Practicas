import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { TEXTO_ROL } from "../helpers/estilos";
import MensajeError from "./ui/MensajeError";

// Aviso masivo (solo admin): una notificación para todos los usuarios activos
// o para los que tienen un rol.
//   POST notificaciones.php { accion: "masivo", destino: "todos" | <rol_id>, titulo, mensaje, enlace? }
const ENLACES = [
  { valor: "", texto: "Sin enlace" },
  { valor: "#/feed", texto: "Feed de prácticas" },
  { valor: "#/mis-postulaciones", texto: "Mis postulaciones" },
  { valor: "#/mis-ofertas", texto: "Mis ofertas" },
  { valor: "#/solicitud-publicacion", texto: "Solicitud de publicación" },
  { valor: "#/perfil", texto: "Mi perfil" },
];

const MAX_TITULO = 150;

export default function AvisosMasivos() {
  const [roles, setRoles] = useState([]);
  const [destino, setDestino] = useState("todos");
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enlace, setEnlace] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("roles.php", { signal: controller.signal })
      .then((res) => setRoles(res.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const nombreDestino =
    destino === "todos"
      ? "todos los usuarios activos"
      : `los usuarios con rol ${TEXTO_ROL[destino] || roles.find((r) => String(r.id) === destino)?.nombre || destino}`;

  const valido = titulo.trim().length > 0 && mensaje.trim().length > 0;

  async function enviar(e) {
    e.preventDefault();
    if (!valido) return;
    if (!confirmar) {
      setConfirmar(true);
      return;
    }
    try {
      setEnviando(true);
      setError(null);
      setExito(null);
      const res = await apiFetch("notificaciones.php", {
        method: "POST",
        body: { accion: "masivo", destino, titulo: titulo.trim(), mensaje: mensaje.trim(), enlace },
      });
      setExito(res.message && res.message !== "Operación exitosa" ? res.message : `Aviso enviado a ${res.data?.enviadas ?? "?"} usuarios.`);
      setTitulo("");
      setMensaje("");
      setEnlace("");
    } catch (err) {
      setError(err.message || "No se pudo enviar el aviso.");
    } finally {
      setEnviando(false);
      setConfirmar(false);
    }
  }

  const claseCampo =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Avisos masivos</h2>
        <p className="text-sm text-slate-500">
          Llega a la campana y al buzón de cada destinatario. Las cuentas suspendidas no lo reciben.
        </p>
      </div>

      {error && <MensajeError texto={error} />}
      {exito && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{exito}</p>
      )}

      <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Destinatarios
          <select
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value);
              setConfirmar(false);
            }}
            className={claseCampo}
          >
            <option value="todos">Todos los usuarios</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                Solo {TEXTO_ROL[r.id] || r.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Título
          <input
            type="text"
            value={titulo}
            maxLength={MAX_TITULO}
            onChange={(e) => {
              setTitulo(e.target.value);
              setConfirmar(false);
            }}
            placeholder="Ej: Mantenimiento programado"
            className={claseCampo}
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {titulo.length}/{MAX_TITULO}
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Mensaje
          <textarea
            value={mensaje}
            rows={5}
            onChange={(e) => {
              setMensaje(e.target.value);
              setConfirmar(false);
            }}
            className={claseCampo}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Al hacer clic, abrir
          <select value={enlace} onChange={(e) => setEnlace(e.target.value)} className={claseCampo}>
            {ENLACES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>

        {confirmar && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Se enviará a {nombreDestino}. No se puede deshacer. Presiona "Confirmar envío" para continuar.
          </p>
        )}

        <div className="flex justify-end gap-2">
          {confirmar && (
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={!valido || enviando}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmar ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {enviando ? "Enviando..." : confirmar ? "Confirmar envío" : "Enviar aviso"}
          </button>
        </div>
      </form>
    </div>
  );
}
