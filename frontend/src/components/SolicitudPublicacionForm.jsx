import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import {
  COLOR_ESTADO_SOLICITUD,
  TEXTO_ESTADO_SOLICITUD,
  formatearFecha,
} from "../helpers/estilos";
import BotonConfirmar from "./ui/BotonConfirmar";

export default function SolicitudPublicacionForm({ onSolicitudEnviada }) {
  const { usuario } = useContext(AuthContext);

  const [solicitudExistente, setSolicitudExistente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  // id de la solicitud pendiente que se está editando (null = alta nueva)
  const [editandoId, setEditandoId] = useState(null);

  const datosIniciales = {
    nombre_organizacion_proyecto: "",
    descripcion_actividades: "",
    documento_respaldo_url: "",
  };

  const [form, setForm] = useState(datosIniciales);
  const [errores, setErrores] = useState({});

  // Cargar si el usuario ya tiene solicitudes previas
  useEffect(() => {
    if (!usuario?.id) return;
    const controller = new AbortController();

    async function cargarSolicitud() {
      try {
        setCargando(true);
        const res = await apiFetch(`solicitudes_publicacion.php?usuario_id=${usuario.id}`, {
          signal: controller.signal,
        });
        const lista = res.data || [];
        if (lista.length > 0) {
          // Tomamos la más reciente
          setSolicitudExistente(lista[0]);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error al cargar solicitudes:", err);
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarSolicitud();
    return () => controller.abort();
  }, [usuario?.id]);

  function validar(datos) {
    const e = {};

    if (!datos.nombre_organizacion_proyecto || datos.nombre_organizacion_proyecto.trim().length < 3) {
      e.nombre_organizacion_proyecto =
        "El nombre de la organización o proyecto debe tener al menos 3 caracteres";
    } else if (datos.nombre_organizacion_proyecto.trim().length > 150) {
      e.nombre_organizacion_proyecto = "No puede superar los 150 caracteres";
    }

    if (!datos.descripcion_actividades || datos.descripcion_actividades.trim().length < 10) {
      e.descripcion_actividades =
        "Describe las actividades con al menos 10 caracteres para que el administrador pueda evaluarla";
    }

    if (datos.documento_respaldo_url && datos.documento_respaldo_url.trim() !== "") {
      const url = datos.documento_respaldo_url.trim();
      if (!/^https?:\/\//i.test(url)) {
        e.documento_respaldo_url = "La URL debe comenzar con http:// o https://";
      }
    }

    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

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

    const validaciones = validar(form);
    setErrores(validaciones);

    if (Object.keys(validaciones).length > 0) {
      return;
    }

    try {
      setEnviando(true);

      // usuario_id no se envía: el backend lo toma de la sesión.
      const payload = {
        nombre_organizacion_proyecto: form.nombre_organizacion_proyecto.trim(),
        descripcion_actividades: form.descripcion_actividades.trim(),
        documento_respaldo_url: form.documento_respaldo_url.trim() || "",
      };

      if (editandoId) {
        await apiFetch("solicitudes_publicacion.php", {
          method: "PUT",
          body: { ...payload, id: editandoId },
        });
        setMensaje({ tipo: "ok", texto: "Solicitud actualizada correctamente." });
      } else {
        await apiFetch("solicitudes_publicacion.php", {
          method: "POST",
          body: payload,
        });
        setMensaje({
          tipo: "ok",
          texto:
            "¡Solicitud enviada exitosamente! Se ha notificado al Administrador para su revisión y aprobación.",
        });
      }

      setForm(datosIniciales);
      setMostrarFormNuevo(false);
      setEditandoId(null);

      // Recargar solicitud
      const res = await apiFetch(`solicitudes_publicacion.php?usuario_id=${usuario.id}`);
      if (res.data && res.data.length > 0) {
        setSolicitudExistente(res.data[0]);
      }

      if (onSolicitudEnviada) {
        onSolicitudEnviada();
      }
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err.message || "Error al registrar la solicitud de publicación.",
      });
    } finally {
      setEnviando(false);
    }
  }

  // Abre el formulario precargado con la solicitud pendiente
  function iniciarEdicion() {
    setMensaje(null);
    setErrores({});
    setForm({
      nombre_organizacion_proyecto: solicitudExistente.nombre_organizacion_proyecto || "",
      descripcion_actividades: solicitudExistente.descripcion_actividades || "",
      documento_respaldo_url: solicitudExistente.documento_respaldo_url || "",
    });
    setEditandoId(solicitudExistente.id);
    setMostrarFormNuevo(true);
  }

  // Cancela (borra) la solicitud pendiente
  async function cancelarSolicitud() {
    setMensaje(null);
    try {
      await apiFetch(`solicitudes_publicacion.php?id=${solicitudExistente.id}`, { method: "DELETE" });
      setSolicitudExistente(null);
      setForm(datosIniciales);
      setMensaje({ tipo: "ok", texto: "Solicitud cancelada. Puedes enviar una nueva cuando quieras." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo cancelar la solicitud." });
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Cargando estado de solicitud...
      </div>
    );
  }

  // Si ya tiene una solicitud registrada y no ha pedido reintentar
  if (solicitudExistente && !mostrarFormNuevo) {
    const esPendiente = solicitudExistente.estado_solicitud === "pendiente";
    const esAprobada = solicitudExistente.estado_solicitud === "aprobada";
    const esRechazada = solicitudExistente.estado_solicitud === "rechazada";

    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Estado de tu Solicitud</h2>
            <p className="mt-1 text-sm text-slate-500">
              Solicitud para publicar convocatorias de prácticas en el sistema.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              COLOR_ESTADO_SOLICITUD[solicitudExistente.estado_solicitud] ||
              "bg-slate-100 text-slate-700"
            }`}
          >
            {TEXTO_ESTADO_SOLICITUD[solicitudExistente.estado_solicitud] ||
              solicitudExistente.estado_solicitud}
          </span>
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

        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Organización / Proyecto:
            </span>
            <p className="text-base font-semibold text-slate-900">
              {solicitudExistente.nombre_organizacion_proyecto}
            </p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fecha de Solicitud:
            </span>
            <p className="text-slate-800">
              {formatearFecha(solicitudExistente.fecha_solicitud)}
            </p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Descripción de Actividades:
            </span>
            <p className="mt-1 whitespace-pre-line text-slate-700">
              {solicitudExistente.descripcion_actividades}
            </p>
          </div>

          {solicitudExistente.documento_respaldo_url && (
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Documento de Respaldo:
              </span>
              <p className="mt-1">
                <a
                  href={solicitudExistente.documento_respaldo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 underline hover:text-indigo-800"
                >
                  🔗 Ver documento o enlace provisto
                </a>
              </p>
            </div>
          )}

          {solicitudExistente.comentario_admin && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <span className="font-bold">Comentario del Administrador:</span>
              <p className="mt-0.5 whitespace-pre-line text-xs">
                {solicitudExistente.comentario_admin}
              </p>
            </div>
          )}
        </div>

        {esPendiente && (
          <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
            ℹ️ Tu solicitud está en proceso de revisión por los administradores. En cuanto sea
            evaluada, recibirás una notificación directa en tu campana.
          </div>
        )}

        {esPendiente && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <BotonConfirmar
              texto="Cancelar solicitud"
              pregunta="¿Cancelar la solicitud?"
              onConfirmar={cancelarSolicitud}
            />
            <button
              type="button"
              onClick={iniciarEdicion}
              className="cursor-pointer rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Editar solicitud
            </button>
          </div>
        )}

        {esAprobada && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            🎉 ¡Felicidades! Ya estás autorizado para publicar ofertas. Ahora puedes dirigirte a la
            pestaña <strong>"Nueva Oferta"</strong> en el menú superior.
          </div>
        )}

        {esRechazada && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditandoId(null);
                setForm(datosIniciales);
                setMostrarFormNuevo(true);
              }}
              className="cursor-pointer rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Enviar una nueva solicitud
            </button>
          </div>
        )}
      </div>
    );
  }

  // Formulario para crear una nueva solicitud
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-2xl font-bold text-slate-900">
          {editandoId ? "Editar Solicitud" : "Solicitar Autorización para Publicar"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Envía tu solicitud al administrador para que tu cuenta sea autorizada a publicar ofertas
          de prácticas y proyectos.
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
        {/* Nombre de la Organización o Proyecto */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Nombre de la Empresa, Organización o Proyecto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="nombre_organizacion_proyecto"
            required
            value={form.nombre_organizacion_proyecto}
            onChange={handleChange}
            placeholder="Ej: InnovaTech Solutions / Startup Campus UMG"
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.nombre_organizacion_proyecto
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {errores.nombre_organizacion_proyecto && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errores.nombre_organizacion_proyecto}
            </p>
          )}
        </div>

        {/* Descripción de Actividades */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Descripción de actividades y justificación <span className="text-red-500">*</span>
          </label>
          <textarea
            name="descripcion_actividades"
            required
            rows={4}
            value={form.descripcion_actividades}
            onChange={handleChange}
            placeholder="Describe qué actividades realizarán los practicantes, por qué requieres estudiantes y el objetivo del proyecto..."
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.descripcion_actividades
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {errores.descripcion_actividades && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errores.descripcion_actividades}
            </p>
          )}
        </div>

        {/* Documento o Enlace de Respaldo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Enlace a documento de respaldo (Opcional)
          </label>
          <input
            type="url"
            name="documento_respaldo_url"
            value={form.documento_respaldo_url}
            onChange={handleChange}
            placeholder="https://ejemplo.com/carta-presentacion.pdf o sitio web institucional"
            className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-1 ${
              errores.documento_respaldo_url
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          <p className="mt-1 text-xs text-slate-400">
            Puedes agregar un enlace público a una carta de presentación, portafolio o sitio web oficial.
          </p>
          {errores.documento_respaldo_url && (
            <p className="mt-1 text-xs font-medium text-red-500">
              {errores.documento_respaldo_url}
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between pt-3">
          {solicitudExistente && (
            <button
              type="button"
              onClick={() => {
                setMostrarFormNuevo(false);
                setEditandoId(null);
              }}
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {editandoId ? "← Cancelar edición" : "← Ver solicitud anterior"}
            </button>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={enviando}
              className="cursor-pointer rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {enviando
                ? "Enviando solicitud..."
                : editandoId ? "Guardar cambios" : "Enviar Solicitud"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
