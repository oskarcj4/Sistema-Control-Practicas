import { useContext, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import { ROL_ESTUDIANTE, obtenerRoles } from "../helpers/estilos";

export default function PostularseForm({ oportunidad, onExito }) {
  const { usuario } = useContext(AuthContext);

  const [form, setForm] = useState({
    cv_url: "",
    constancia_estudios_url: "",
    mensaje_presentacion: "",
  });

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Verificamos si el usuario actual tiene rol de estudiante
  const roles = obtenerRoles(usuario);
  const esEstudiante = roles.includes(ROL_ESTUDIANTE);

  if (!esEstudiante) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm font-medium text-amber-800">
          ⚠️ Solo los usuarios con rol de <strong>Estudiante</strong> pueden postularse a esta práctica.
        </p>
      </div>
    );
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje(null);

    // Validación básica de URL
    if (!form.cv_url.startsWith("http://") && !form.cv_url.startsWith("https://")) {
      setMensaje({
        tipo: "error",
        texto: "La URL de tu CV debe empezar con http:// o https:// (ej: Google Drive o LinkedIn).",
      });
      return;
    }

    setEnviando(true);

    try {
      await apiFetch("postulaciones.php", {
        method: "POST",
        body: {
          oportunidad_id: oportunidad.id,
          estudiante_id: usuario.id,
          cv_url: form.cv_url.trim(),
          constancia_estudios_url: form.constancia_estudios_url.trim() || null,
          mensaje_presentacion: form.mensaje_presentacion.trim() || null,
        },
      });

      setMensaje({
        tipo: "ok",
        texto: "¡Postulación enviada con éxito! Puedes darle seguimiento en 'Mis Postulaciones'.",
      });

      if (onExito) {
        setTimeout(() => {
          onExito();
        }, 1500);
      }
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err.message || "Ocurrió un error al enviar tu postulación.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">Postularme a esta práctica</h3>

      {mensaje && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Enlace a tu CV / Portafolio <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          name="cv_url"
          required
          value={form.cv_url}
          onChange={handleChange}
          placeholder="https://drive.google.com/... o enlace público a tu CV"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Asegúrate de que el archivo tenga permisos públicos de lectura.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Constancia de estudios (URL opcional)
        </label>
        <input
          type="url"
          name="constancia_estudios_url"
          value={form.constancia_estudios_url}
          onChange={handleChange}
          placeholder="https://... enlace opcional a tu constancia"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Mensaje de presentación (Opcional)
        </label>
        <textarea
          name="mensaje_presentacion"
          rows={3}
          value={form.mensaje_presentacion}
          onChange={handleChange}
          placeholder="Cuéntale al reclutador por qué te interesa esta práctica y cuáles son tus habilidades principales..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={enviando}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Enviando postulación..." : "Enviar Postulación"}
        </button>
      </div>
    </form>
  );
}
