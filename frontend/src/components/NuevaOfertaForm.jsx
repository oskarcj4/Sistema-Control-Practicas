import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";

/**
 * =============================================================================
 * COMPONENTE: NuevaOfertaForm (T11)
 * =============================================================================
 *
 * PROPÓSITO:
 * Formulario para que Reclutadores y Administradores publiquen nuevas
 * oportunidades de prácticas en el sistema.
 *
 * -----------------------------------------------------------------------------
 * CONTRATO CON EL BACKEND (POST oportunidades.php):
 * Endpoint: /SistemaControlPracticas/api/endpoints/oportunidades.php
 * Método:   POST (JSON)
 *
 * CAMPOS ESPERADOS:
 * - titulo            (string, obligatorio, 3 a 150 caracteres)
 * - descripcion       (string, obligatorio, mínimo 10 caracteres)
 * - requisitos        (string, obligatorio, texto libre)
 * - institucion_id    (entero, obligatorio -> sale de usuario.institucion_id o de instituciones.php)
 * - carrera_id        (entero, opcional -> carrera objetivo o null para cualquier carrera)
 * - modalidad         (enum: 'presencial' | 'remoto' | 'hibrido')
 * - ubicacion         (string, obligatoria si es presencial o híbrido; opcional si es remoto)
 * - fecha_publicacion (fecha YYYY-MM-DD -> por defecto la fecha de hoy)
 * - fecha_cierre      (fecha YYYY-MM-DD -> obligatoria, debe ser igual o posterior a hoy)
 *
 * creado_por lo extrae el backend automáticamente de la sesión.
 *
 * MODO EDICIÓN: si recibe la prop `oportunidad`, precarga sus datos y guarda con
 * PUT oportunidades.php (id + campos + estado_oportunidad + visto). El backend
 * solo deja editar al creador de la oferta o a un administrador.
 * -----------------------------------------------------------------------------
 */

// "2026-11-06 00:00:00" -> "2026-11-06" (los inputs type=date no aceptan la hora)
function soloFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

export default function NuevaOfertaForm({ onOfertaCreada, oportunidad = null, onCancelar }) {
  const esEdicion = Boolean(oportunidad);
  const { usuario } = useContext(AuthContext);

  const fechaHoy = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const datosIniciales = esEdicion
    ? {
        titulo: oportunidad.titulo || "",
        descripcion: oportunidad.descripcion || "",
        requisitos: oportunidad.requisitos || "",
        institucion_id: oportunidad.institucion_id ? String(oportunidad.institucion_id) : "",
        carrera_id: oportunidad.carrera_id ? String(oportunidad.carrera_id) : "",
        modalidad: oportunidad.modalidad || "presencial",
        ubicacion: oportunidad.ubicacion || "",
        fecha_publicacion: soloFecha(oportunidad.fecha_publicacion),
        fecha_cierre: soloFecha(oportunidad.fecha_cierre),
      }
    : {
    titulo: "",
    descripcion: "",
    requisitos: "",
    institucion_id: usuario?.institucion_id ? String(usuario.institucion_id) : "",
    carrera_id: "",
    modalidad: "presencial",
    ubicacion: "",
    fecha_publicacion: fechaHoy,
    fecha_cierre: "",
  };

  const [form, setForm] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [carreras, setCarreras] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto: string }

  // Si el usuario tiene una institución asignada en su perfil, la preseleccionamos
  useEffect(() => {
    if (usuario?.institucion_id && !form.institucion_id) {
      setForm((prev) => ({
        ...prev,
        institucion_id: String(usuario.institucion_id),
      }));
    }
  }, [usuario?.institucion_id]);

  // Carga de catálogos (carreras e instituciones)
  useEffect(() => {
    const controller = new AbortController();

    async function cargarCatalogos() {
      try {
        const [resCarreras, resInst] = await Promise.all([
          apiFetch("carreras.php", { signal: controller.signal }),
          apiFetch("instituciones.php", { signal: controller.signal }),
        ]);

        setCarreras(resCarreras.data || []);
        setInstituciones(resInst.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setMensaje({ tipo: "error", texto: "Error al cargar catálogos: " + err.message });
      }
    }

    cargarCatalogos();
    return () => controller.abort();
  }, []);

  function validar(datos) {
    const e = {};

    // 1. Título (3 a 150 caracteres)
    if (!datos.titulo || datos.titulo.trim().length < 3) {
      e.titulo = "El título debe tener al menos 3 caracteres";
    } else if (datos.titulo.trim().length > 150) {
      e.titulo = "El título no puede exceder 150 caracteres";
    }

    // 2. Institución
    if (!datos.institucion_id) {
      e.institucion_id = "Debes seleccionar una institución o empresa";
    }

    // 3. Modalidad y Ubicación
    if (datos.modalidad !== "remoto") {
      if (!datos.ubicacion || datos.ubicacion.trim().length < 3) {
        e.ubicacion = "La ubicación es obligatoria para modalidad presencial o híbrida (mínimo 3 caracteres)";
      } else if (datos.ubicacion.trim().length > 150) {
        e.ubicacion = "La ubicación no puede exceder 150 caracteres";
      }
    }

    // 4. Fechas
    if (!datos.fecha_publicacion) {
      e.fecha_publicacion = "La fecha de publicación es obligatoria";
    }

    if (!datos.fecha_cierre) {
      e.fecha_cierre = "La fecha límite de postulación es obligatoria";
    } else if (datos.fecha_publicacion && datos.fecha_cierre < datos.fecha_publicacion) {
      e.fecha_cierre = "La fecha de cierre no puede ser anterior a la fecha de publicación";
    } else if (datos.fecha_publicacion && datos.fecha_cierre) {
      const dias = (new Date(datos.fecha_cierre) - new Date(datos.fecha_publicacion)) / (1000 * 60 * 60 * 24);
      if (dias > 365) {
        e.fecha_cierre = "La convocatoria no puede tener una duración mayor a 365 días";
      }
    }

    // 5. Descripción (mínimo 10 caracteres)
    if (!datos.descripcion || datos.descripcion.trim().length < 10) {
      e.descripcion = "La descripción debe tener al menos 10 caracteres";
    }

    // 6. Requisitos (mínimo 2 caracteres)
    if (!datos.requisitos || datos.requisitos.trim().length < 2) {
      e.requisitos = "Los requisitos deben tener al menos 2 caracteres";
    }

    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpia el error de ese campo si el usuario lo empieza a corregir
    if (errores[name]) {
      setErrores((prev) => {
        const copia = { ...prev };
        delete copia[name];
        return copia;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje(null);

    const validacionesErrores = validar(form);
    setErrores(validacionesErrores);

    if (Object.keys(validacionesErrores).length > 0) {
      return;
    }

    try {
      setEnviando(true);

      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        requisitos: form.requisitos.trim(),
        institucion_id: form.institucion_id ? Number(form.institucion_id) : null,
        carrera_id: form.carrera_id ? Number(form.carrera_id) : null,
        modalidad: form.modalidad,
        ubicacion: form.modalidad === "remoto" ? (form.ubicacion.trim() || "Remoto") : form.ubicacion.trim(),
        fecha_publicacion: form.fecha_publicacion,
        fecha_cierre: form.fecha_cierre,
      };

      if (esEdicion) {
        await apiFetch("oportunidades.php", {
          method: "PUT",
          body: {
            ...payload,
            id: oportunidad.id,
            estado_oportunidad: oportunidad.estado_oportunidad || "activa",
            visto: Number(oportunidad.visto) === 1 ? 1 : 0,
          },
        });
        setErrores({});
        setMensaje({ tipo: "ok", texto: "Oferta actualizada correctamente." });
        if (onOfertaCreada) {
          onOfertaCreada();
        }
        return;
      }

      await apiFetch("oportunidades.php", {
        method: "POST",
        body: payload,
      });

      setErrores({});
      setMensaje({ tipo: "ok", texto: "¡Oferta de práctica publicada con éxito!" });

      // Vaciamos el formulario restaurando datos iniciales
      setForm({
        ...datosIniciales,
        institucion_id: usuario?.institucion_id ? String(usuario.institucion_id) : "",
      });

      if (onOfertaCreada) {
        onOfertaCreada();
      }
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "Error al publicar la oferta." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-900">
          {esEdicion ? "Editar Práctica" : "Publicar Nueva Práctica"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {esEdicion
            ? "Modifica los datos de tu convocatoria."
            : "Crea una convocatoria para que los estudiantes puedan postularse."}
        </p>
      </div>

      {mensaje && (
        <div
          className={`mt-4 rounded-xl p-3 text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {/* Título de la práctica */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Título de la oportunidad <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="titulo"
            required
            value={form.titulo}
            onChange={handleChange}
            placeholder="Ej: Desarrollador Web Frontend Jr"
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.titulo
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {errores.titulo && <p className="mt-1 text-xs text-red-500 font-medium">{errores.titulo}</p>}
        </div>

        {/* Institución y Carrera Objetivo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Institución / Empresa <span className="text-red-500">*</span>
            </label>
            <select
              name="institucion_id"
              required
              value={form.institucion_id}
              onChange={handleChange}
              className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
                errores.institucion_id
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            >
              <option value="">Selecciona la institución</option>
              {instituciones.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre} {inst.siglas ? `(${inst.siglas})` : ""}
                </option>
              ))}
            </select>
            {errores.institucion_id && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errores.institucion_id}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Carrera objetivo (Opcional)
            </label>
            <select
              name="carrera_id"
              value={form.carrera_id}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Cualquier carrera (Abierta)</option>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.codigo ? `(${c.codigo})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modalidad y Ubicación */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Modalidad <span className="text-red-500">*</span>
            </label>
            <select
              name="modalidad"
              required
              value={form.modalidad}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Ubicación {form.modalidad !== "remoto" && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="ubicacion"
              value={form.ubicacion}
              onChange={handleChange}
              placeholder={form.modalidad === "remoto" ? "Ej: Remoto / Desde casa" : "Ej: Zona 10, Edificio..."}
              className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
                errores.ubicacion
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {errores.ubicacion && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errores.ubicacion}</p>
            )}
          </div>
        </div>

        {/* Fechas: Publicación y Cierre */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Fecha de publicación <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fecha_publicacion"
              required
              value={form.fecha_publicacion}
              onChange={handleChange}
              className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
                errores.fecha_publicacion
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {errores.fecha_publicacion && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errores.fecha_publicacion}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Fecha límite de postulación <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="fecha_cierre"
              required
              min={form.fecha_publicacion}
              value={form.fecha_cierre}
              onChange={handleChange}
              className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
                errores.fecha_cierre
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {errores.fecha_cierre && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errores.fecha_cierre}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Descripción de actividades y tareas <span className="text-red-500">*</span>
          </label>
          <textarea
            name="descripcion"
            required
            rows={4}
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Describe las principales responsabilidades, proyectos a desarrollar y el ambiente de trabajo..."
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.descripcion
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {errores.descripcion && (
            <p className="mt-1 text-xs text-red-500 font-medium">{errores.descripcion}</p>
          )}
        </div>

        {/* Requisitos */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Requisitos y conocimientos requeridos <span className="text-red-500">*</span>
          </label>
          <textarea
            name="requisitos"
            required
            rows={3}
            value={form.requisitos}
            onChange={handleChange}
            placeholder="Ej: Estudiante de 6to semestre en adelante, conocimientos de React, SQL, proactivo..."
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.requisitos
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {errores.requisitos && (
            <p className="mt-1 text-xs text-red-500 font-medium">{errores.requisitos}</p>
          )}
        </div>

        {/* Botón de Enviar */}
        <div className="flex justify-end gap-3 pt-3">
          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              disabled={enviando}
              className="cursor-pointer rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="cursor-pointer rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {enviando
              ? esEdicion ? "Guardando cambios..." : "Publicando oferta..."
              : esEdicion ? "Guardar cambios" : "Publicar Oportunidad"}
          </button>
        </div>
      </form>
    </div>
  );
}
