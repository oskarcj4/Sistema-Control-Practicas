import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ROL,
  ROL_ADMIN,
  ROL_ESTUDIANTE,
  ROL_RECLUTADOR,
  TEXTO_ROL,
  obtenerRoles,
} from "../helpers/estilos";
import BuscadorUsuarios from "./BuscadorUsuarios";
import NotificacionesDropdown from "./NotificacionesDropdown";

// Props:
//   pestanas: arreglo { id, texto } con las pestañas a mostrar
//   pestanaActiva : id de la pestaña seleccionada
//   onCambiarPestana : función(id) que cambia de pantalla
//   notificaciones : arreglo para la campana
//   onClickNotificacion : función(notificacion) al hacer clic
//   onMarcarTodas : marca todas como leídas
//   onVerBuzon : abre la pestaña Buzón
export default function Navbar({
  pestanas,
  pestanaActiva,
  onCambiarPestana,
  notificaciones,
  onClickNotificacion,
  onMarcarTodas,
  onVerBuzon,
}) {
  const { usuario, logout } = useContext(AuthContext);

  // Elige el rol "más importante" para el badge: Admin > Reclutador > Estudiante
  const roles = obtenerRoles(usuario);
  const esAdmin = Boolean(usuario?.isAdmin || roles.includes(ROL_ADMIN));
  const esReclutador = roles.includes(ROL_RECLUTADOR);
  const esEstudiante = roles.includes(ROL_ESTUDIANTE);
  // autorizado_publicar viene de login.php (se lee de la BD en cada carga de sesión)
  const puedePublicar = esAdmin || esReclutador || Number(usuario?.autorizado_publicar) === 1;

  const pestanasVisibles = pestanas.filter((p) => {
    if (p.id === "admin") {
      return esAdmin;
    }
    if (p.id === "nueva-oferta" || p.id === "mis-ofertas") {
      return puedePublicar;
    }
    if (p.id === "mis-postulaciones") {
      return esEstudiante;
    }
    if (p.id === "solicitud-publicacion") {
      // Visible para usuarios que no son admin y aún no están autorizados a publicar ofertas
      return !puedePublicar;
    }
    return true; // "feed", "perfil"
  });

  let rolBadge = 1;
  if (esAdmin) {
    rolBadge = ROL_ADMIN;
  } else if (esReclutador) {
    rolBadge = ROL_RECLUTADOR;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      {/* Fila superior: Logo + Buscador (Lupa) + Usuario + Campana + Salir */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
            SP
          </span>
          <span className="hidden text-lg font-bold text-slate-800 lg:block">
            Sistema de Prácticas
          </span>
        </div>

        {/* Lupa / Buscador de usuarios */}
        <div className="mx-2 flex-1 max-w-xs sm:max-w-sm">
          <BuscadorUsuarios />
        </div>

        {/* Info usuario + notificaciones + logout */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">@{usuario?.username}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ROL[rolBadge]}`}>
              {TEXTO_ROL[rolBadge]}
            </span>
          </div>

          <NotificacionesDropdown
            notificaciones={notificaciones}
            onClickNotificacion={onClickNotificacion}
            onMarcarTodas={onMarcarTodas}
            onVerBuzon={onVerBuzon}
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

      {/* Fila inferior: pestañas */}
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {pestanasVisibles.map((pestana) => {
          const activa = pestana.id === pestanaActiva;
          return (
            <button
              key={pestana.id}
              type="button"
              onClick={() => onCambiarPestana(pestana.id)}
              className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
                activa
                  ? "border-indigo-600 text-indigo-600 font-semibold"
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
