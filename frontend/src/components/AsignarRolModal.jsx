import { useState } from "react";
import { COLOR_ROL, TEXTO_ROL } from "../helpers/estilos";

// Modal para asignar o quitar roles a un usuario.
// Solo dibuja. Las llamadas POST / DELETE a asignaciones_roles.php las haces tú.
//
// Props:
//   usuario        -> el usuario que se está editando. Si es null, el modal no se dibuja.
//   rolesAsignados -> arreglo de GET asignaciones_roles.php?id_usuario=X
//                     cada elemento: { id_usuario, id_rol, rol }
//   rolesDisponibles -> arreglo de roles posibles: [{ id: 1, nombre: "estudiante" }, ...]
//   onAsignar(idRol) -> se llama al presionar "Asignar"       (tu POST)
//   onQuitar(idRol)  -> se llama al presionar la X de un rol (tu DELETE)
//   onCerrar         -> cierra el modal
export default function AsignarRolModal({
  usuario,
  rolesDisponibles,
  onAsignar,
  onQuitar,
  onCerrar,
}) {
  const [rolElegido, setRolElegido] = useState("");
  const [rolesAsignados, setRolesAsignados] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  if (!usuario) {
    return null;
  }


  const idsAsignados = rolesAsignados.map((asignacion) => Number(asignacion.id_rol));
  const rolesQueFaltan = rolesDisponibles.filter(
    (rol) => !idsAsignados.includes(Number(rol.id))
  );

  function handleAsignar() {
    if (!rolElegido) {
      return;
    }
    onAsignar(Number(rolElegido));
    setRolElegido("");
  }

  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-4 top-4 cursor-pointer rounded-full px-2 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >

        </button>

        <h2 className="text-xl font-bold text-slate-800">Roles de @{usuario.username}</h2>
        {/* Roles actuales (el último no se puede quitar) */}
        <h3 className="mt-5 text-sm font-semibold text-slate-700">Roles asignados</h3>
        {rolesAsignados.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No tiene roles asignados.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {rolesAsignados.map((asignacion) => (
              <span
                key={asignacion.id_rol}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  COLOR_ROL[asignacion.id_rol] || "bg-slate-100 text-slate-700"
                }`}
              >
                {TEXTO_ROL[asignacion.id_rol] || asignacion.rol}
                <button
                  type="button"
                  onClick={() => onQuitar(Number(asignacion.id_rol))}
                  className="ml-1 cursor-pointer font-bold hover:opacity-60"
                  title="Quitar rol"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Agregar un rol nuevo */}
        <h3 className="mt-6 text-sm font-semibold text-slate-700">Asignar nuevo rol</h3>
        <div className="mt-2 flex gap-2">
          <select
            value={rolElegido}
            onChange={(e) => setRolElegido(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Seleccione un rol</option>
            {rolesQueFaltan.map((rol) => (
              <option key={rol.id} value={rol.id}>
                {TEXTO_ROL[rol.id] || rol.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAsignar}
            disabled={!rolElegido}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}
