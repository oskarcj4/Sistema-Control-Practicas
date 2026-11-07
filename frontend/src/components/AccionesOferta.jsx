import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ESTADO_POSTULACION,
  ROL_ADMIN,
  ROL_ESTUDIANTE,
  TEXTO_ESTADO_POSTULACION,
  obtenerRoles,
} from "../helpers/estilos";
import { irA } from "../helpers/rutas";
import GestionPostulantes from "./GestionPostulantes";
import PostularseForm from "./PostularseForm";

// Lo que se ve al final de una oferta según quién la mira:
//   creador o admin            -> postulantes
//   estudiante ya postulado    -> estado de su postulación (sin formulario)
//   estudiante sin postular    -> formulario (solo si la oferta sigue activa)
//
// Props:
//   oportunidad -> oferta de GET oportunidades.php (trae "mi_postulacion": estado o null)
//   onPostulado -> (opcional) se llama tras postularse con éxito
export default function AccionesOferta({ oportunidad, onPostulado }) {
  const { usuario } = useContext(AuthContext);
  const roles = obtenerRoles(usuario);
  const esAdmin = Boolean(usuario?.isAdmin || roles.includes(ROL_ADMIN));
  const esCreador = Number(oportunidad.creado_por) === Number(usuario?.id);

  if (esAdmin || esCreador) {
    return <GestionPostulantes oportunidad={oportunidad} />;
  }

  if (!roles.includes(ROL_ESTUDIANTE)) {
    return null;
  }

  if (oportunidad.mi_postulacion) {
    return <YaPostulado estado={oportunidad.mi_postulacion} />;
  }

  const abierta =
    (oportunidad.estado_oportunidad || "activa") === "activa" &&
    String(oportunidad.fecha_cierre || "").slice(0, 10) >= hoyLocal();

  if (!abierta) {
    return <p className="text-sm text-slate-500">Esta oferta ya no recibe postulaciones.</p>;
  }

  return <PostularseForm oportunidad={oportunidad} onExito={onPostulado} />;
}

// "YYYY-MM-DD" en hora local (toISOString usa UTC y adelanta el día por la noche)
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function YaPostulado({ estado }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-indigo-900">Ya te postulaste a esta oferta</p>
        <span
          className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            COLOR_ESTADO_POSTULACION[estado] || "bg-slate-100 text-slate-700"
          }`}
        >
          {TEXTO_ESTADO_POSTULACION[estado] || estado}
        </span>
      </div>
      <button
        type="button"
        onClick={() => irA("#/mis-postulaciones")}
        className="cursor-pointer rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
      >
        Ver mis postulaciones
      </button>
    </div>
  );
}
