import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

// Permisos de publicación (panel admin).
// Lista quién puede publicar sin ser admin y permite revocar el permiso
// (solicitud aprobada por error, abuso) o darlo directamente.
//   GET usuarios.php?publicadores=1
//   GET usuarios.php?q=texto                (buscar a quién autorizar)
//   PUT usuarios.php { accion: "permiso_publicar", id, autorizar, motivo, quitar_reclutador, cerrar_ofertas }
// El backend notifica al usuario en ambos casos.
export default function PermisosPublicacion() {
  const [publicadores, setPublicadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Revocar
  const [revocando, setRevocando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [quitarReclutador, setQuitarReclutador] = useState(true);
  const [cerrarOfertas, setCerrarOfertas] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Autorizar directamente
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  const cargar = useCallback(async (signal) => {
    try {
      setError(null);
      const res = await apiFetch("usuarios.php?publicadores=1", { signal });
      setPublicadores(res.data || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
    } finally {
      if (!signal?.aborted) setCargando(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    cargar(controller.signal);
    return () => controller.abort();
  }, [cargar]);

  // Búsqueda con espera para no pedir en cada tecla
  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      apiFetch(`usuarios.php?q=${encodeURIComponent(termino)}`, { signal: controller.signal })
        .then((res) => setResultados(res.data || []))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [busqueda]);

  function abrirRevocar(u) {
    setRevocando(u);
    setMotivo("");
    setQuitarReclutador(true);
    setCerrarOfertas(false);
    setErrorModal(null);
  }

  async function cambiarPermiso(usuario, autorizar, extra = {}) {
    const res = await apiFetch("usuarios.php", {
      method: "PUT",
      body: { accion: "permiso_publicar", id: usuario.id, autorizar: autorizar ? 1 : 0, ...extra },
    });
    return typeof res.data === "string" ? res.data : "";
  }

  async function confirmarRevocar(e) {
    e.preventDefault();
    if (motivo.trim().length < 5) {
      setErrorModal("Escribe el motivo (mínimo 5 caracteres). El usuario lo recibirá como notificación.");
      return;
    }
    try {
      setGuardando(true);
      setErrorModal(null);
      const texto = await cambiarPermiso(revocando, false, {
        motivo: motivo.trim(),
        quitar_reclutador: quitarReclutador ? 1 : 0,
        cerrar_ofertas: cerrarOfertas ? 1 : 0,
      });
      setMensaje({ tipo: "ok", texto: `@${revocando.username}: ${texto || "permiso revocado"}.` });
      setRevocando(null);
      await cargar();
    } catch (err) {
      setErrorModal(err.message || "No se pudo revocar el permiso.");
    } finally {
      setGuardando(false);
    }
  }

  async function autorizar(usuario) {
    setMensaje(null);
    try {
      await cambiarPermiso(usuario, true);
      setMensaje({ tipo: "ok", texto: `@${usuario.username} ya puede publicar ofertas.` });
      setBusqueda("");
      setResultados([]);
      await cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo autorizar." });
    }
  }

  const idsPublicadores = new Set(publicadores.map((p) => Number(p.id)));
  const candidatos = resultados.filter((u) => !idsPublicadores.has(Number(u.id)));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Permisos de publicación</h3>
        <p className="text-sm text-slate-500">
          Usuarios que pueden publicar ofertas (sin contar administradores). Revoca el permiso si una
          solicitud se aprobó por error o si alguien está abusando.
        </p>
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

      {/* Autorizar directamente */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Autorizar a un usuario sin solicitud
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, usuario o email..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        {busqueda.trim().length >= 2 && (
          <ul className="mt-2 divide-y divide-slate-100">
            {candidatos.length === 0 ? (
              <li className="py-2 text-sm text-slate-400">Sin resultados (o ya pueden publicar).</li>
            ) : (
              candidatos.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm text-slate-700">
                    {u.nombre} {u.apellido} <span className="text-slate-400">@{u.username}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => autorizar(u)}
                    className="cursor-pointer rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Autorizar
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {cargando && <Spinner texto="Cargando..." />}
      {error && <MensajeError texto={`Error: ${error}`} />}
      {!cargando && !error && publicadores.length === 0 && (
        <EstadoVacio titulo="Nadie más puede publicar" mensaje="Solo los administradores publican ofertas." />
      )}

      {!cargando && publicadores.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Institución</th>
                <th className="px-4 py-3">Permiso por</th>
                <th className="px-4 py-3">Ofertas activas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {publicadores.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">
                      {u.nombre} {u.apellido}
                    </p>
                    <p className="text-xs text-slate-500">@{u.username} · {u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.institucion || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Number(u.autorizado_publicar) === 1 && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          Solicitud aprobada
                        </span>
                      )}
                      {Number(u.es_reclutador) === 1 && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                          Rol reclutador
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.ofertas_activas}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => abrirRevocar(u)}
                      className="cursor-pointer rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      Revocar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revocando && (
        <Modal titulo={`Revocar permiso a @${revocando.username}`} onCerrar={() => setRevocando(null)} ancho="max-w-lg">
          <form onSubmit={confirmarRevocar} className="space-y-4" noValidate>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Motivo (se envía al usuario) <span className="text-red-500">*</span>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: La solicitud se aprobó por error / Publicaciones que no cumplen las normas..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            {Number(revocando.es_reclutador) === 1 && (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={quitarReclutador}
                  onChange={(e) => setQuitarReclutador(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Quitar también el rol <strong>reclutador</strong>
                  <span className="block text-xs text-slate-500">Si no, el rol le sigue permitiendo publicar.</span>
                </span>
              </label>
            )}

            {Number(revocando.ofertas_activas) > 0 && (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={cerrarOfertas}
                  onChange={(e) => setCerrarOfertas(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Cancelar sus {revocando.ofertas_activas} ofertas activas
                  <span className="block text-xs text-slate-500">
                    Úsalo en caso de abuso. Si no, las ofertas siguen visibles hasta su fecha de cierre.
                  </span>
                </span>
              </label>
            )}

            {errorModal && <MensajeError texto={errorModal} />}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevocando(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {guardando ? "Revocando..." : "Revocar permiso"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
