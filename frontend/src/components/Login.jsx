import { useState } from "react";
import { apiFetch } from "../api/generic-api";
import Campo from "../helpers/Campo";
import claseInput from "../helpers/claseInput";

const datosIniciales = {
  identificador: "",
  contrasena: "",
};

export default function Login({ onCambiarVista, onLoginExitoso }) {
  const [form, setForm] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validar(datos) {
    const e = {};

    const ident = datos.identificador ? datos.identificador.trim() : "";
    if (!ident || ident.length < 3) {
      e.identificador = "El usuario o correo debe tener al menos 3 caracteres";
    } else if (ident.length > 150) {
      e.identificador = "El identificador no puede exceder 150 caracteres";
    } else if (ident.includes("@")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ident)) {
        e.identificador = "Email no válido";
      }
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(ident)) {
      e.identificador = "Solo se permiten letras, números, guiones y puntos";
    }

    if (!datos.contrasena || datos.contrasena.length < 8) {
      e.contrasena = "La contraseña debe tener al menos 8 caracteres";
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

    const formData = new FormData();
    formData.append("identificador", form.identificador.trim());
    formData.append("contrasena", form.contrasena);

    try {
      setEnviando(true);
      // apiFetch envía la cookie y guarda el csrfToken que devuelve el backend
      const resultado = await apiFetch("login.php", {
        method: "POST",
        body: formData,
      });

      setMensaje({
        tipo: "ok",
        texto: resultado.message || "Inicio de sesión exitoso.",
      });
      setForm(datosIniciales);
      setErrores({});
      setTimeout(() => {
        onLoginExitoso(resultado.data)
      }, 1800)
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-xl font-bold text-slate-800">Iniciar Sesión</h2>

      {mensaje && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            mensaje.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <Campo etiqueta="Usuario o Correo Electrónico" error={errores.identificador}>
        <input
          name="identificador"
          type="text"
          value={form.identificador}
          onChange={handleChange}
          className={claseInput(errores.identificador)}
          placeholder="ej: usuario o usuario@correo.com"
        />
      </Campo>

      <Campo etiqueta="Contraseña" error={errores.contrasena}>
        <input
          name="contrasena"
          type="password"
          value={form.contrasena}
          onChange={handleChange}
          className={claseInput(errores.contrasena)}
          placeholder="••••••••"
        />
      </Campo>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {enviando ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿No tienes una cuenta?{" "}
        <button
          type="button"
          onClick={onCambiarVista}
          className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
        >
          Regístrate
        </button>
      </p>
    </form>
  );
}
