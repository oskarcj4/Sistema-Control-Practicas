import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { COLOR_ESTADO_POSTULACION, TEXTO_ESTADO_POSTULACION } from "../helpers/estilos";
import { irA } from "../helpers/rutas";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Panel de inicio del administrador: cifras del sistema.
//   GET estadisticas.php (solo admin)
const ESTADOS = ["pendiente", "en_revision", "aceptada", "rechazada"];

export default function InicioAdmin() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("estadisticas.php", { signal: controller.signal })
      .then((res) => {
        setDatos(res.data || null);
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "No se pudieron cargar las cifras.");
      });
    return () => controller.abort();
  }, [recarga]);

  if (error) return <MensajeError texto={error} />;
  if (!datos) return <Spinner texto="Cargando resumen..." />;

  // Últimos 7 días, rellenando con 0 los días sin postulaciones
  const porDia = new Map((datos.postulaciones_por_dia || []).map((d) => [d.dia, Number(d.total)]));
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (6 - i));
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    return {
      clave,
      etiqueta: fecha.toLocaleDateString("es", { weekday: "short", day: "numeric" }),
      total: porDia.get(clave) || 0,
    };
  });
  const maxDia = Math.max(1, ...dias.map((d) => d.total));

  const porEstado = datos.postulaciones_por_estado || {};
  const totalEstados = ESTADOS.reduce((s, e) => s + Number(porEstado[e] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Resumen</h2>
        <button
          type="button"
          onClick={() => setRecarga((n) => n + 1)}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ↻ Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra
          titulo="Solicitudes pendientes"
          valor={datos.solicitudes_pendientes}
          destacar={datos.solicitudes_pendientes > 0}
          onClick={() => irA("#/admin/solicitudes")}
        />
        <Cifra
          titulo="Ofertas activas"
          valor={datos.ofertas_activas}
          detalle={`${datos.ofertas_por_vencer} cierran en 7 días`}
          onClick={() => irA("#/feed")}
        />
        <Cifra
          titulo="Postulaciones (7 días)"
          valor={datos.postulaciones_semana}
          detalle={`${datos.postulaciones_pendientes} pendientes de revisar`}
        />
        <Cifra
          titulo="Usuarios nuevos (7 días)"
          valor={datos.usuarios_nuevos_semana}
          detalle={`${datos.usuarios_activos} activos · ${datos.usuarios_suspendidos} suspendidos`}
          onClick={() => irA("#/admin/usuarios")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Postulaciones por día</h3>
          <div className="mt-4 flex h-40 items-end gap-2">
            {dias.map((d) => (
              <div key={d.clave} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold text-slate-600">{d.total}</span>
                <div
                  className="w-full rounded-t-md bg-indigo-500"
                  style={{ height: `${(d.total / maxDia) * 100}%`, minHeight: d.total > 0 ? 4 : 1 }}
                  title={`${d.total} postulaciones`}
                />
                <span className="text-[11px] capitalize text-slate-400">{d.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Postulaciones por estado (total)</h3>
          {totalEstados === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Aún no hay postulaciones.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {ESTADOS.map((estado) => {
                const total = Number(porEstado[estado] || 0);
                return (
                  <li key={estado}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">{TEXTO_ESTADO_POSTULACION[estado]}</span>
                      <span className="font-semibold text-slate-700">{total}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${COLOR_ESTADO_POSTULACION[estado]?.split(" ")[0] || "bg-slate-300"}`}
                        style={{ width: `${(total / totalEstados) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Cifra({ titulo, valor, detalle, destacar = false, onClick }) {
  const Etiqueta = onClick ? "button" : "div";
  return (
    <Etiqueta
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm ${
        destacar ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
      } ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`}
    >
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
    </Etiqueta>
  );
}
