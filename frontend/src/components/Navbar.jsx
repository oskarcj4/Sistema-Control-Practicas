import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ROL,
  ROL_ADMIN,
  ROL_RECLUTADOR,
  TEXTO_ROL,
  obtenerRoles,
} from "../helpers/estilos";
import NotificacionesDropdown from "./NotificacionesDropdown";

// T1 - Barra de navegación global.
//
// Props:
//   pestanas: arreglo { id, texto } con las pestañas a mostrar, de debe decidir qué pestañas recibe según el rol. T10
//   pestanaActiva : id de la pestaña seleccionada
//   onCambiarPestana : función(id) que cambia de pantalla
//   notificaciones : (opcional) arreglo para la campana (T17)
//   onClickNotificacion : (opcional) función(notificacion) (T18)
export default function Navbar({
  pestanas,
  pestanaActiva,
  onCambiarPestana,
  notificaciones,
  onClickNotificacion,
}) {
  const { usuario, logout } = useContext(AuthContext); // Obtenemos el usuario del AuthContext

  // Elige el rol "mass importante" para el badge: Admin - Reclutador - Estudiambre
  const roles = obtenerRoles(usuario);
//  console.log(usuario);

  const pestanasVisibles = pestanas.filter((p) => {
    if (p.id === "admin") {
      return usuario.isAdmin
    }
    if (p.id === "nueva-oferta"){
      return (usuario.rol === ROL_RECLUTADOR|| usuario.rol === ROL_ADMIN)
    }
    return true;

  })

  let rolBadge = 1;
  if (usuario?.isAdmin || roles.includes(ROL_ADMIN)) {
    rolBadge = ROL_ADMIN;
  } else if (roles.includes(ROL_RECLUTADOR)) {
    rolBadge = ROL_RECLUTADOR;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      {/* Fila superior: logo + usuario + campana + salir */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
            SP
          </span>
          <span className="hidden text-lg font-bold text-slate-800 sm:block">
            Sistema de Prácticas
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">@{usuario?.username}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ROL[rolBadge]}`}>
              {TEXTO_ROL[rolBadge]}
            </span>
          </div>

          <NotificacionesDropdown
            notificaciones={notificaciones}
            onClickNotificacion={onClickNotificacion}
          />

          <button
            type="button"
            onClick={logout}
            className="cursor-pointer rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Fila inferior: pestañas. overflow-x-auto permite deslizar en celular. */}
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {/* Cambiar a pestanasVisibles para produccion */}
        {pestanas.map((pestana) => {
          const activa = pestana.id === pestanaActiva;
          return (
            <button
              key={pestana.id}
              type="button"
              onClick={() => onCambiarPestana(pestana.id)}
              className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
                activa
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {pestana.texto}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
