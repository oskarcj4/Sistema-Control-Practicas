import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { ROL_ADMIN, ROL_ESTUDIANTE, ROL_RECLUTADOR, TEXTO_ROL, formatearFecha } from "../helpers/estilos";
import AsignarRolModal from "./AsignarRolModal";
import BotonConfirmar from "./ui/BotonConfirmar";
import EstadoVacio from "./ui/EstadoVacio";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// T15 - Tabla de usuarios del sistema (vista del Administrador).
// Solo dibuja. La carga (GET usuarios.php) y el PUT de suspender los haces tú.
//
// Props:
//   usuarios           -> arreglo de GET usuarios.php
//   onCambiarEstado    -> (opcional) función(usuario) para el botón Suspender/Reactivar
//   onGestionarRoles   -> (opcional) función(usuario) para abrir el modal de roles (T14)
export default function TablaUsuarios({onCambiarEstado, onGestionarRoles }) {
  const [cargando, setCargando] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [usuarioParaRoles, setUsuarioParaRoles] = useState(null);
  const [filtroRol, setFiltroRol] = useState(""); // "" = todos; si no, id de rol
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }

  // GET usuarios.php (todos) o usuarios.php?rol_id=X (filtrado en el servidor)
  useEffect(() => {
    const controller = new AbortController();

    async function cargarUsuarios() {
      try {
        setCargando(true);
        setErrorCarga(null);
        const ruta = filtroRol ? `usuarios.php?rol_id=${filtroRol}` : "usuarios.php";
        const res = await apiFetch(ruta, { signal: controller.signal });
        setUsuarios(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarUsuarios();
    return () => controller.abort();
  }, [filtroRol]);

  // Borrado lógico del usuario (DELETE usuarios.php?id=X)
  async function handleEliminar(u) {
    setMensaje(null);
    try {
      await apiFetch(`usuarios.php?id=${u.id}`, { method: "DELETE" });
      setUsuarios((prev) => prev.filter((item) => item.id !== u.id));
      setMensaje({ tipo: "ok", texto: `Usuario @${u.username} eliminado.` });
    } catch (err) {
      setMensaje({ tipo: "error", texto: "Error al eliminar: " + err.message });
    }
  }


    async function handleCambiarEstado(u) {
      const nuevoEstado = u.estado_cuenta === "activo" ? "suspendido": "activo";
      setMensaje(null);
    try{
      // El PUT reemplaza todos los campos: se reenvía el perfil completo
      // para no borrar institución, carrera, carnet, etc.
      await apiFetch("usuarios.php", {
      method: "PUT",
      body: {
        id: u.id,
        estado_cuenta: nuevoEstado,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        institucion_id: u.institucion_id ?? "",
        carrera_id: u.carrera_id ?? "",
        carnet: u.carnet ?? "",
        telefono: u.telefono ?? "",
        biografia: u.biografia ?? "",
      }
    } );
    setUsuarios((prev) =>
      prev.map((item) =>
        item.id === u.id ? { ...item, estado_cuenta: nuevoEstado } : item
      )
    );
    }

    catch(err){
        setMensaje({ tipo: "error", texto: "Error al cambiar estado: " + err.message });
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Rol:
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Todos</option>
            {[ROL_ESTUDIANTE, ROL_RECLUTADOR, ROL_ADMIN].map((id) => (
              <option key={id} value={id}>{TEXTO_ROL[id]}</option>
            ))}
          </select>
        </label>
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

      {cargando && <Spinner texto="Cargando usuarios..." />}
      {errorCarga && <MensajeError texto={`Error: ${errorCarga}`} />}
      {!cargando && !errorCarga && usuarios.length === 0 && (
        <EstadoVacio titulo="Sin usuarios" mensaje="No hay usuarios con ese rol." />
      )}

    {!cargando && usuarios.length > 0 && (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Institución / Carrera</th>
            <th className="px-4 py-3">Registro</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {usuarios.map((u) => {
            const estaActivo = u.estado_cuenta === "activo";

            return (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">
                    {u.nombre} {u.apellido}
                  </p>
                  <p className="text-xs text-slate-500">
                    @{u.username} · {u.email}
                  </p>
                </td>

                <td className="px-4 py-3 capitalize text-slate-600">{u.rol}</td>

                <td className="px-4 py-3 text-slate-600">
                  <p>{u.institucion || "—"}</p>
                  <p className="text-xs text-slate-400">{u.carrera || ""}</p>
                </td>

                <td className="px-4 py-3 text-slate-600">{formatearFecha(u.fecha_registro)}</td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      estaActivo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {estaActivo ? "Activo" : "Suspendido"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onGestionarRoles && (
                      <button
                        type="button"
                        onClick={() => onGestionarRoles(u)}
                        className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Roles
                      </button>
                    )}
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(u)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                          estaActivo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {estaActivo ? "Suspender" : "Reactivar"}
                      </button>
                      <BotonConfirmar
                        texto="Eliminar"
                        pregunta="¿Eliminar usuario?"
                        onConfirmar={() => handleEliminar(u)}
                      />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    )}

      { usuarioParaRoles && (
        <AsignarRolModal
        usuario={usuarioParaRoles}
        onCerrar={() => setUsuarioParaRoles(null)}
        />
      )
      }

    </div>
  );
}
