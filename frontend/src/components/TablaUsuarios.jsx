import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { formatearFecha } from "../helpers/estilos";

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
  useEffect(() => {
    const controller = new AbortController();

    async function cargarUsuarios() {
      try{const res = await apiFetch("usuarios.php", {signal: controlador.signal});
       setUsuarios(res.data);
      }
      catch(err) {
        if(err.name === 'AbortError'){
          setErrorCarga(err.message);
        }
      }
      finally{
        if(!controller.signal.aborted){
          setCargando(false);
        }
      }
    }

    cargarUsuarios();
  }, [])

  return (
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
                    {onCambiarEstado && (
                      <button
                        type="button"
                        onClick={() => onCambiarEstado(u)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                          estaActivo ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {estaActivo ? "Suspender" : "Reactivar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
