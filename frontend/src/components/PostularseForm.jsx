import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import { ROL_ESTUDIANTE, obtenerRoles } from "../helpers/estilos";

// Props:
//   oportunidad -> oferta a la que se postula (modo alta)
//   postulacion -> (opcional) postulación pendiente a editar. Si viene, el formulario
//                  precarga sus datos y envía POST accion=actualizar (archivos opcionales).
//   onExito     -> función al terminar bien
export default function PostularseForm({ oportunidad, postulacion = null, onExito }) {
  const { usuario } = useContext(AuthContext);
  const esEdicion = Boolean(postulacion);

  // Estados del formulario según el nuevo contrato del backend (docs/SUBIDA_ARCHIVOS.md)
  const [carreras, setCarreras] = useState([]);
  const [cargandoCarreras, setCargandoCarreras] = useState(true);

  const [form, setForm] = useState(
    esEdicion
      ? {
          carrera_id: postulacion.carrera_id ? String(postulacion.carrera_id) : "",
          edad: postulacion.edad ? String(postulacion.edad) : "",
          ciclo_universitario: postulacion.ciclo_universitario ? String(postulacion.ciclo_universitario) : "",
          mensaje_presentacion: postulacion.mensaje_presentacion || "",
        }
      : {
          carrera_id: oportunidad?.carrera_id ? String(oportunidad.carrera_id) : "",
          edad: "",
          ciclo_universitario: "",
          mensaje_presentacion: "",
        }
  );
  const [quitarConstancia, setQuitarConstancia] = useState(false);

  const [archivoCv, setArchivoCv] = useState(null);
  const [archivoConstancia, setArchivoConstancia] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

  // 1. Cargar la lista de carreras activas para el select
  useEffect(() => {
    const controller = new AbortController();

    async function cargarCarreras() {
      try {
        const res = await apiFetch(`carreras.php?institucion_id=${usuario.institucion_id}`, { signal: controller.signal });
        setCarreras(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error al cargar carreras:", err);
      } finally {
        setCargandoCarreras(false);
      }
    }

    cargarCarreras();
    return () => controller.abort();
  }, []);

  // 2. Verificación de rol: solo estudiantes pueden postularse
  const roles = obtenerRoles(usuario);
  const esEstudiante = roles.includes(ROL_ESTUDIANTE);

  if (!esEstudiante) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm font-medium text-amber-800">
          ⚠️ Solo los usuarios con rol de <strong>Estudiante</strong> pueden postularse a oportunidades de práctica.
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

    // Validaciones en el cliente (en edición el CV es opcional: si no se manda, se conserva)
    if (!archivoCv && !esEdicion) {
      setMensaje({ tipo: "error", texto: "Debes seleccionar tu archivo de CV en formato PDF." });
      return;
    }

    if (archivoCv && archivoCv.type !== "application/pdf") {
      setMensaje({ tipo: "error", texto: "El CV debe ser estrictamente un archivo PDF." });
      return;
    }

    const LIMITE_MB = 5 * 1024 * 1024; // 5 MB
    if (archivoCv && archivoCv.size > LIMITE_MB) {
      setMensaje({ tipo: "error", texto: "El archivo del CV no debe superar los 5 MB." });
      return;
    }

    if (archivoConstancia && archivoConstancia.size > LIMITE_MB) {
      setMensaje({ tipo: "error", texto: "La constancia de estudios no debe superar los 5 MB." });
      return;
    }

    // Construcción del FormData (multipart/form-data)
    // estudiante_id no se envía: el backend lo toma de la sesión.
    const fd = new FormData();
    if (esEdicion) {
      fd.append("accion", "actualizar");
      fd.append("id", String(postulacion.id));
      if (quitarConstancia && !archivoConstancia) {
        fd.append("quitar_constancia", "1");
      }
    } else {
      fd.append("oportunidad_id", String(oportunidad.id));
    }
    fd.append("carrera_id", String(form.carrera_id));
    fd.append("edad", String(form.edad));
    fd.append("ciclo_universitario", String(form.ciclo_universitario));

    if (form.mensaje_presentacion.trim()) {
      fd.append("mensaje_presentacion", form.mensaje_presentacion.trim());
    }

    if (archivoCv) {
      fd.append("cv", archivoCv);
    }

    if (archivoConstancia) {
      fd.append("constancia_estudios", archivoConstancia);
    }

    setEnviando(true);

    try {
      await apiFetch("postulaciones.php", {
        method: "POST",
        body: fd,
      });

      setMensaje({
        tipo: "ok",
        texto: esEdicion
          ? "Postulación actualizada correctamente."
          : "¡Postulación enviada con éxito! Tus documentos han sido guardados.",
      });

      if (onExito) {
        setTimeout(() => {
          onExito();
        }, 1500);
      }
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err.message || "Ocurrió un error al enviar la postulación.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">
          {esEdicion ? "Editar mi postulación" : "Postularme a esta práctica"}
        </h3>
        <p className="text-xs text-slate-500">
          Completa tus datos académicos y adjunta tus documentos requeridos.
        </p>
      </div>

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

      {/* Selector de Carrera */}
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Carrera que cursas <span className="text-red-500">*</span>
        </label>
        <select
          name="carrera_id"
          required
          value={form.carrera_id}
          onChange={handleChange}
          disabled={cargandoCarreras}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">
            {cargandoCarreras ? "Cargando carreras..." : "Selecciona tu carrera"}
          </option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.codigo ? `(${c.codigo})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Edad y Ciclo en dos columnas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Edad <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="edad"
            required
            min="15"
            max="99"
            value={form.edad}
            onChange={handleChange}
            placeholder="Ej: 21"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500">
            Ciclo / Semestre universitario <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="ciclo_universitario"
            required
            min="1"
            max="20"
            value={form.ciclo_universitario}
            onChange={handleChange}
            placeholder="Ej: 6"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Subida de Archivo: CV (PDF obligatorio) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <label className="block text-xs font-bold uppercase text-slate-700">
          📄 Currículum Vitae (CV) {!esEdicion && <span className="text-red-500">*</span>}
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Solo formato <strong>PDF</strong>. Tamaño máximo: 5 MB.
          {esEdicion && " Déjalo vacío para conservar el CV actual."}
        </p>
        <input
          type="file"
          accept="application/pdf"
          required={!esEdicion}
          onChange={(e) => setArchivoCv(e.target.files[0] || null)}
          className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:hover:bg-indigo-700"
        />
        {archivoCv && (
          <p className="mt-1.5 text-xs font-medium text-indigo-700">
            ✓ Archivo seleccionado: {archivoCv.name} ({(archivoCv.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Subida de Archivo: Constancia de Estudios (Opcional) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <label className="block text-xs font-bold uppercase text-slate-700">
          🎓 Constancia de Estudios (Opcional)
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Formatos aceptados: <strong>PDF, JPG, PNG</strong>. Tamaño máximo: 5 MB.
        </p>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setArchivoConstancia(e.target.files[0] || null)}
          className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:hover:bg-slate-800"
        />
        {archivoConstancia && (
          <p className="mt-1.5 text-xs font-medium text-slate-700">
            ✓ Archivo seleccionado: {archivoConstancia.name} ({(archivoConstancia.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        {esEdicion && postulacion.constancia_estudios_url && !archivoConstancia && (
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={quitarConstancia}
              onChange={(e) => setQuitarConstancia(e.target.checked)}
            />
            Quitar la constancia actual
          </label>
        )}
      </div>

      {/* Mensaje de Presentación */}
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Mensaje de presentación (Opcional)
        </label>
        <textarea
          name="mensaje_presentacion"
          rows={3}
          maxLength={3000}
          value={form.mensaje_presentacion}
          onChange={handleChange}
          placeholder="Cuéntale al reclutador por qué te interesa esta práctica y cuáles son tus habilidades principales..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Botón de Enviar */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={enviando}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando
            ? "Subiendo archivos y enviando..."
            : esEdicion ? "Guardar cambios" : "Enviar Postulación"}
        </button>
      </div>
    </form>
  );
}
