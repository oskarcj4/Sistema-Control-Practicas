import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_MODALIDAD,
  COLOR_ROL,
  ROL_ADMIN,
  TEXTO_MODALIDAD,
  TEXTO_ROL,
  formatearFecha,
  obtenerRoles,
} from "../helpers/estilos";
import { irA } from "../helpers/rutas";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Perfil público de un usuario: #/usuario/<id>
//   GET usuarios.php?perfil=X -> datos públicos + ofertas activas (cualquier usuario)
//   GET usuarios.php?id=X     -> además email, teléfono, carnet y estado (solo admin)
export default function PerfilPublico({ id }) {
  const { usuario: sesion } = useContext(AuthContext);
  const esAdmin = Boolean(sesion?.isAdmin || obtenerRoles(sesion).includes(ROL_ADMIN));
  const esYo = Number(sesion?.id) === Number(id);

  const [perfil, setPerfil] = useState(null);
  const [privado, setPrivado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function cargar() {
      try {
        setCargando(true);
        setError(null);
        setPrivado(null);
        const res = await apiFetch(`usuarios.php?perfil=${id}`, { signal: controller.signal });
        setPerfil(res.data || null);
        if (esAdmin) {
          const resPrivado = await apiFetch(`usuarios.php?id=${id}`, { signal: controller.signal });
          setPrivado(resPrivado.data || null);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "No se pudo cargar el perfil.");
      } finally {
        if (!controller.signal.aborted) setCargando(false);
      }
    }

    cargar();
    return () => controller.abort();
  }, [id, esAdmin]);

  const volver = () => (window.history.length > 1 ? window.history.back() : irA("#/feed"));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button
        type="button"
        onClick={volver}
        className="cursor-pointer text-sm font-semibold text-indigo-600 hover:underline"
      >
        ← Volver
      </button>

      {cargando && <Spinner texto="Cargando perfil..." />}
      {error && <MensajeError texto={error} />}

      {!cargando && perfil && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                {`${(perfil.nombre || "U").charAt(0)}${(perfil.apellido || "").charAt(0)}`.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  {perfil.nombre} {perfil.apellido}
                </h2>
                <p className="text-sm text-slate-500">@{perfil.username}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {obtenerRoles(perfil).map((r) => (
                    <span
                      key={r}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ROL[r] || "bg-slate-100 text-slate-700"}`}
                    >
                      {TEXTO_ROL[r] || "Usuario"}
                    </span>
                  ))}
                </div>
              </div>
              {esYo && (
                <button
                  type="button"
                  onClick={() => irA("#/perfil")}
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Editar mi perfil
                </button>
              )}
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Dato etiqueta="Institución" valor={perfil.institucion} />
              <Dato etiqueta="Carrera" valor={perfil.carrera} />
              <Dato etiqueta="Miembro desde" valor={formatearFecha(perfil.fecha_registro)} />
              {privado && (
                <>
                  <Dato etiqueta="Correo" valor={privado.email} enlace={`mailto:${privado.email}`} />
                  <Dato etiqueta="Teléfono" valor={privado.telefono} />
                  <Dato etiqueta="Carnet" valor={privado.carnet} />
                  <Dato
                    etiqueta="Estado de la cuenta"
                    valor={privado.estado_cuenta === "activo" ? "Activa" : privado.estado_cuenta}
                  />
                </>
              )}
            </dl>
            {privado && <p className="mt-2 text-xs text-slate-400">Correo, teléfono y carnet solo los ven administradores.</p>}

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-700">Biografía</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
                {perfil.biografia || "Este usuario aún no escribió una biografía."}
              </p>
            </div>
          </section>

          {perfil.ofertas_activas?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800">Ofertas activas</h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {perfil.ofertas_activas.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => irA(`#/oferta/${o.id}`)}
                      className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{o.titulo}</p>
                        <p className="text-xs text-slate-500">
                          {o.institucion || "Sin institución"} · Cierra {formatearFecha(o.fecha_cierre)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          COLOR_MODALIDAD[o.modalidad] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {TEXTO_MODALIDAD[o.modalidad] || o.modalidad}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor, enlace }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{etiqueta}</dt>
      <dd className="mt-0.5 text-slate-700">
        {!valor ? (
          <span className="text-slate-400">—</span>
        ) : enlace ? (
          <a href={enlace} className="text-indigo-600 hover:underline">
            {valor}
          </a>
        ) : (
          valor
        )}
      </dd>
    </div>
  );
}
