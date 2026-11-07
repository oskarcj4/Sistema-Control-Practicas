import { useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import { COLOR_ROL, ROL_ADMIN, TEXTO_ROL } from "../helpers/estilos";
import MensajeError from "./ui/MensajeError";
import Modal from "./ui/Modal";
import Spinner from "./ui/Spinner";

// Modal para asignar o quitar roles a un usuario (solo admin).
//   GET    roles.php                                   -> roles posibles
//   GET    asignaciones_roles.php?id_usuario=X          -> roles actuales { id_usuario, id_rol, rol }
//   POST   asignaciones_roles.php { id_usuario, id_rol }
//   DELETE asignaciones_roles.php?id_usuario=X&id_rol=Y
// El backend impide: quitar el único rol, quitarte tu propio admin y dejar el
// sistema sin administradores. Notifica al usuario en cada cambio.
//
// Props:
//   usuario    -> el usuario que se está editando. Si es null, no se dibuja.
//   onCerrar   -> cierra el modal
//   onCambio   -> (opcional) se llama tras asignar o quitar, para recargar la tabla
export default function AsignarRolModal({ usuario, onCerrar, onCambio }) {
  const { usuario: sesion } = useContext(AuthContext);
  const usuarioId = usuario?.id;
  const esUnoMismo = Number(sesion?.id) === Number(usuarioId);

  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [rolesAsignados, setRolesAsignados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [rolElegido, setRolElegido] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // Dar admin pide un segundo clic de confirmación
  const [confirmarAdmin, setConfirmarAdmin] = useState(false);

  const cargarAsignados = useCallback(
    async (signal) => {
      const res = await apiFetch(`asignaciones_roles.php?id_usuario=${usuarioId}`, { signal });
      setRolesAsignados(res.data || []);
    },
    [usuarioId]
  );

  useEffect(() => {
    if (!usuarioId) return;
    const controller = new AbortController();

    async function cargar() {
      try {
        setCargando(true);
        setError(null);
        const [resRoles] = await Promise.all([
          apiFetch("roles.php", { signal: controller.signal }),
          cargarAsignados(controller.signal),
        ]);
        setRolesDisponibles(resRoles.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "No se pudieron cargar los roles.");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    cargar();
    return () => controller.abort();
  }, [usuarioId, cargarAsignados]);

  if (!usuario) {
    return null;
  }

  const idsAsignados = rolesAsignados.map((a) => Number(a.id_rol));
  const rolesQueFaltan = rolesDisponibles.filter((rol) => !idsAsignados.includes(Number(rol.id)));
  const nombreRol = (id, respaldo) => TEXTO_ROL[id] || respaldo;

  async function ejecutar(accion, textoOk) {
    try {
      setOcupado(true);
      setError(null);
      setMensaje(null);
      await accion();
      await cargarAsignados();
      setMensaje(textoOk);
      if (onCambio) onCambio();
    } catch (err) {
      setError(err.message || "No se pudo guardar el cambio.");
    } finally {
      setOcupado(false);
    }
  }

  function handleAsignar() {
    const idRol = Number(rolElegido);
    if (!idRol) return;
    if (idRol === ROL_ADMIN && !confirmarAdmin) {
      setConfirmarAdmin(true);
      return;
    }
    const rol = rolesDisponibles.find((r) => Number(r.id) === idRol);
    ejecutar(
      () => apiFetch("asignaciones_roles.php", { method: "POST", body: { id_usuario: usuarioId, id_rol: idRol } }),
      `Rol "${nombreRol(idRol, rol?.nombre)}" asignado.`
    );
    setRolElegido("");
    setConfirmarAdmin(false);
  }

  function handleQuitar(asignacion) {
    const idRol = Number(asignacion.id_rol);
    ejecutar(
      () => apiFetch(`asignaciones_roles.php?id_usuario=${usuarioId}&id_rol=${idRol}`, { method: "DELETE" }),
      `Rol "${nombreRol(idRol, asignacion.rol)}" retirado.`
    );
  }

  return (
    <Modal titulo={`Roles de @${usuario.username}`} onCerrar={onCerrar} ancho="max-w-md">
      <p className="-mt-2 mb-4 text-sm text-slate-500">
        {usuario.nombre} {usuario.apellido}
      </p>

      {cargando && <Spinner texto="Cargando roles..." />}
      {error && <MensajeError texto={error} />}
      {mensaje && <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{mensaje}</p>}

      {!cargando && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-slate-700">Roles asignados</h3>
          {rolesAsignados.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No tiene roles asignados.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {rolesAsignados.map((asignacion) => {
                const idRol = Number(asignacion.id_rol);
                // Sin "×" si es su único rol o si es tu propio rol de admin (el backend también lo bloquea)
                const sePuedeQuitar =
                  rolesAsignados.length > 1 && !(esUnoMismo && idRol === ROL_ADMIN);
                return (
                  <span
                    key={idRol}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      COLOR_ROL[idRol] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {nombreRol(idRol, asignacion.rol)}
                    {sePuedeQuitar && (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => handleQuitar(asignacion)}
                        className="ml-1 cursor-pointer font-bold hover:opacity-60 disabled:cursor-not-allowed"
                        title="Quitar rol"
                        aria-label={`Quitar rol ${nombreRol(idRol, asignacion.rol)}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          {esUnoMismo && idsAsignados.includes(ROL_ADMIN) && (
            <p className="mt-2 text-xs text-slate-400">
              No puedes quitarte tu propio rol de administrador; pídeselo a otro administrador.
            </p>
          )}

          <h3 className="mt-6 text-sm font-semibold text-slate-700">Asignar nuevo rol</h3>
          {rolesQueFaltan.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Ya tiene todos los roles.</p>
          ) : (
            <div className="mt-2 flex gap-2">
              <select
                value={rolElegido}
                onChange={(e) => {
                  setRolElegido(e.target.value);
                  setConfirmarAdmin(false);
                }}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Seleccione un rol</option>
                {rolesQueFaltan.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {nombreRol(Number(rol.id), rol.nombre)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAsignar}
                disabled={!rolElegido || ocupado}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  confirmarAdmin ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {confirmarAdmin ? "Confirmar" : "Asignar"}
              </button>
            </div>
          )}
          {confirmarAdmin && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Un administrador puede gestionar usuarios, roles, catálogos y solicitudes. Presiona
              "Confirmar" para dar acceso total a @{usuario.username}.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
