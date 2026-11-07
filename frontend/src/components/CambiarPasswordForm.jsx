import { useState } from "react";
import { apiFetch } from "../api/generic-api";
import Campo from "../helpers/Campo";
import claseInput from "../helpers/claseInput";
import Modal from "./ui/Modal";

// Modal "Cambiar contraseña" del perfil.
//   PUT cambio_contrasena.php { password_actual, password_nueva, password_nueva_confirmacion }
// El id del usuario NO se envía: el backend lo toma de la sesión.

const formVacio = {
  password_actual: "",
  password_nueva: "",
  password_nueva_confirmacion: "",
};

export default function CambiarPasswordForm({ onCerrar }) {
  const [form, setForm] = useState(formVacio);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }
  const [enviando, setEnviando] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Mismas reglas que el backend. Las contraseñas no se recortan.
  function validar(datos) {
    const e = {};

    if (!datos.password_actual) {
      e.password_actual = "Ingresa tu contraseña actual";
    }

    if (datos.password_nueva.length < 8) {
      e.password_nueva = "La contraseña nueva debe tener al menos 8 caracteres";
    } else if (datos.password_nueva === datos.password_actual) {
      e.password_nueva = "La contraseña nueva debe ser distinta a la actual";
    }

    if (datos.password_nueva_confirmacion !== datos.password_nueva) {
      e.password_nueva_confirmacion = "Las contraseñas no coinciden";
    }

    return e;
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
      await apiFetch("cambio_contrasena.php", { method: "PUT", body: form });
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada correctamente" });
      setForm(formVacio);
      setTimeout(onCerrar, 1500);
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Cambiar contraseña" onCerrar={onCerrar} ancho="max-w-md">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {mensaje && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              mensaje.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {mensaje.texto}
          </p>
        )}

        <Campo etiqueta="Contraseña actual" error={errores.password_actual}>
          <input
            name="password_actual"
            type="password"
            autoComplete="current-password"
            value={form.password_actual}
            onChange={handleChange}
            className={claseInput(errores.password_actual)}
          />
        </Campo>

        <Campo etiqueta="Contraseña nueva" error={errores.password_nueva}>
          <input
            name="password_nueva"
            type="password"
            autoComplete="new-password"
            value={form.password_nueva}
            onChange={handleChange}
            className={claseInput(errores.password_nueva)}
          />
        </Campo>

        <Campo etiqueta="Confirmar contraseña nueva" error={errores.password_nueva_confirmacion}>
          <input
            name="password_nueva_confirmacion"
            type="password"
            autoComplete="new-password"
            value={form.password_nueva_confirmacion}
            onChange={handleChange}
            className={claseInput(errores.password_nueva_confirmacion)}
          />
        </Campo>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="flex-1 cursor-pointer rounded-lg border border-slate-300 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 cursor-pointer rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
