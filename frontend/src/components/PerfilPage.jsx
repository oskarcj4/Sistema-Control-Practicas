import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ROL,
  ROL_ADMIN,
  ROL_RECLUTADOR,
  TEXTO_ROL,
  formatearFecha,
  obtenerRoles,
} from "../helpers/estilos";
import PerfilForm from "./PerfilForm";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

export default function PerfilPage() {
  const { usuario, logout } = useContext(AuthContext);

  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [editando, setEditando] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function cargarPerfil(signal) {
    if (!usuario?.id) return;
    try {
      const res = await apiFetch(`usuarios.php?id=${usuario.id}`, { signal });
      setPerfil(res.data);
    } catch (err) {
      if (err.name === "AbortError") return;
      setErrorCarga(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    cargarPerfil(controller.signal);
    return () => controller.abort();
  }, [usuario?.id]);

  // Manejo del Soft Delete
  async function handleEliminarCuenta() {
    setEliminando(true);
    try {
      await apiFetch(`usuarios.php?id=${usuario.id}`, {
        method: "DELETE",
      });
      // El backend hizo el UPDATE estado = 0. Cerramos sesión de inmediato.
      logout();
    } catch (err) {
      alert("Error al eliminar cuenta: " + err.message);
      setEliminando(false);
    }
  }

  if (cargando) {
    return <Spinner texto="Cargando tu perfil..." />;
  }

  if (errorCarga) {
    return <MensajeError texto={errorCarga} />;
  }

  if (!perfil) {
    return null;
  }

  // Determinar rol principal para la insignia
  const roles = obtenerRoles(usuario);
  let rolBadge = 1;
  if (usuario?.isAdmin || roles.includes(ROL_ADMIN)) {
    rolBadge = ROL_ADMIN;
  } else if (roles.includes(ROL_RECLUTADOR)) {
    rolBadge = ROL_RECLUTADOR;
  }

  const iniciales = `${perfil.nombre?.charAt(0) || ""}${perfil.apellido?.charAt(0) || ""}`.toUpperCase() || "U";

  // Si el usuario presionó "Editar Perfil", mostramos el formulario actual
  if (editando) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Volver a mi perfil
          </button>
          <span className="text-xs text-slate-400">Modo edición</span>
        </div>

        <PerfilForm
          onVolver={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false);
            cargarPerfil();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Contenedor estilo Facebook: Portada + Cabecera de perfil */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Banner de Portada */}
        <div className="relative h-44 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 sm:h-56">
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Sección de Avatar, Nombres y Botones de acción */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            {/* Avatar circular superpuesto */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <div className="-mt-16 flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-3xl font-extrabold text-white shadow-md sm:-mt-20 sm:h-32 sm:w-32 sm:text-4xl">
                {iniciales}
              </div>

              <div className="text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {perfil.nombre} {perfil.apellido}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ROL[rolBadge]}`}
                  >
                    {TEXTO_ROL[rolBadge]}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">@{perfil.username}</p>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
              >
                ✏️ Editar Perfil
              </button>

              <button
                type="button"
                onClick={() => setMostrarModalEliminar(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                🗑️ Eliminar cuenta
              </button>
            </div>
          </div>

          {/* Línea divisoria */}
          <hr className="my-6 border-slate-100" />

          {/* Biografía */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Acerca de mí
            </h3>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {perfil.biografia ? perfil.biografia : "Aún no has agregado una biografía a tu perfil."}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta de Información Detallada */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Información Académica y de Contacto</h3>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Institución */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">🏛️</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Institución / Universidad</p>
              <p className="text-sm font-bold text-slate-800">
                {perfil.institucion || "No especificada"}
              </p>
            </div>
          </div>

          {/* Carrera */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Carrera</p>
              <p className="text-sm font-bold text-slate-800">{perfil.carrera || "No especificada"}</p>
            </div>
          </div>

          {/* Carné */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">🆔</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Carné de estudiante</p>
              <p className="text-sm font-bold text-slate-800">{perfil.carnet || "No registrado"}</p>
            </div>
          </div>

          {/* Correo Electrónico */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">📧</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Correo Electrónico</p>
              <p className="text-sm font-bold text-slate-800">{perfil.email}</p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">📱</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Teléfono</p>
              <p className="text-sm font-bold text-slate-800">{perfil.telefono || "No registrado"}</p>
            </div>
          </div>

          {/* Fecha de Registro */}
          <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Miembro desde</p>
              <p className="text-sm font-bold text-slate-800">
                {formatearFecha(perfil.fecha_registro)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para Soft Delete */}
      {mostrarModalEliminar && (
        <div
          onClick={() => setMostrarModalEliminar(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">
              ⚠️
            </div>

            <h3 className="mt-4 text-center text-lg font-bold text-slate-900">
              ¿Eliminar tu cuenta?
            </h3>

            <p className="mt-2 text-center text-sm text-slate-600">
              Tu cuenta pasará a estado inactivo (borrado lógico). Ya no podrás iniciar sesión ni
              acceder a tus postulaciones. Esta acción es definitiva.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setMostrarModalEliminar(false)}
                disabled={eliminando}
                className="flex-1 cursor-pointer rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleEliminarCuenta}
                disabled={eliminando}
                className="flex-1 cursor-pointer rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
