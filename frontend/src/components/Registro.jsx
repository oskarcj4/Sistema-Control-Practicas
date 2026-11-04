import { useContext, useState } from "react";
import { BASE_API } from "../api/generic-api";
import { RegisterContext } from "../context/RegisterContext";
import Campo from "../helpers/Campo";
import claseInput from "../helpers/claseInput";


const datosIniciales = {
  username: "",
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  confirmarPassword: "",
  institucion_id: "",
  carrera_id: "",
  carnet: "",
  telefono: "",
  biografia: "",
  acepta: false,
};



export default function Registro({ onCambiarVista }) {
  const { cargandoInstituciones, carreras, instituciones, cargandoCarreras, errorCarga, setInstitucionId } = useContext(RegisterContext)
  const [form, setForm] = useState(datosIniciales);
  const [errores, setErrores] = useState({}); // errores de validación del formulario
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto } useState(false);
  const [enviando, setEnviando] = useState(false);


  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const siguiente = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      // Al cambiar de institución, la carrera elegida ya no es válida
      if (name === "institucion_id") {
        siguiente.carrera_id = "";
        setInstitucionId(value);
      }
      return siguiente;
    });
  }

  function validar(datos) {
    const e = {};

    if (!datos.username || datos.username.trim().length < 3) {
      e.username = "El nombre de usuario debe tener al menos 3 caracteres";
    } else if (datos.username.trim().length > 50) {
      e.username = "El nombre de usuario no puede exceder 50 caracteres";
    } else if (!/^[a-zA-Z0-9_]+$/.test(datos.username.trim())) {
      e.username = "Solo se permiten letras, números y guiones bajos";
    }

    if (!datos.nombre || datos.nombre.trim().length < 2) {
      e.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (datos.nombre.trim().length > 100) {
      e.nombre = "El nombre no puede exceder 100 caracteres";
    }

    if (!datos.apellido || datos.apellido.trim().length < 2) {
      e.apellido = "El apellido debe tener al menos 2 caracteres";
    } else if (datos.apellido.trim().length > 100) {
      e.apellido = "El apellido no puede exceder 100 caracteres";
    }

    if (!datos.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
      e.email = "Email no válido";
    } else if (datos.email.trim().length > 150) {
      e.email = "El correo no puede exceder 150 caracteres";
    }

    if (!datos.password || datos.password.length < 8) {
      e.password = "La contraseña debe tener al menos 8 caracteres";
    }

    if (datos.password !== datos.confirmarPassword) {
      e.confirmarPassword = "Las contraseñas no coinciden";
    }

    if (datos.carnet && datos.carnet.trim().length > 30) {
      e.carnet = "El carnet no puede exceder 30 caracteres";
    }

    if (datos.telefono && datos.telefono.trim()) {
      if (!/^[0-9+\s-]{7,30}$/.test(datos.telefono.trim())) {
        e.telefono = "Formato de teléfono no válido";
      }
    }

    if (datos.biografia && datos.biografia.length > 1000) {
      e.biografia = "La biografía no puede exceder los 1000 caracteres";
    }

    if (!datos.acepta) {
      e.acepta = "Debes aceptar los términos";
    }

    return e;
  }

  async function handleSubmit(e) {

    e.preventDefault();
    setMensaje(null);

    const formElement = e.currentTarget;
    const formData = new FormData(e.currentTarget);
    const datos = Object.fromEntries(formData);

    const validacionesErrores = validar(datos);
    setErrores(validacionesErrores);

    if (Object.keys(validacionesErrores).length > 0) {
      return;
    }

    try {
      setEnviando(true);
      const res = await fetch(`${BASE_API}/usuarios.php`, {
        method: "POST",
        body: formData,
      });

      // Puede que el servidor responda sin JSON válido en errores
      let resultado = {};
      try {
        resultado = await res.json();
      } catch {
        resultado = {};
      }

      if (!res.ok || (resultado.code !== undefined && resultado.code !== 1)) {
        throw new Error(resultado.message || `Error ${res.status} al procesar el registro`);
      }

      setMensaje({ tipo: "ok", texto: resultado.message || "Usuario registrado con éxito" });
      setForm(datosIniciales);
      setErrores({});
      setTimeout(() => {
        onCambiarVista()}, 1800);

    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  if (cargandoInstituciones) {
    return <p className="mx-auto max-w-lg p-6 text-center text-slate-600">Cargando formulario...</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-xl font-bold text-slate-800">Registro de Usuario</h2>

      {errorCarga && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorCarga}</p>
      )}

      {mensaje && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            mensaje.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {mensaje.texto}
        </p>
      )}

      <Campo etiqueta="Nombre de Usuario" error={errores.username}>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          className={claseInput(errores.username)}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            className={claseInput(errores.nombre)}
          />
        </Campo>

        <Campo etiqueta="Apellido" error={errores.apellido}>
          <input
            name="apellido"
            value={form.apellido}
            onChange={handleChange}
            className={claseInput(errores.apellido)}
          />
        </Campo>
      </div>

      <Campo etiqueta="Correo Electrónico" error={errores.email}>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className={claseInput(errores.email)}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Contraseña" error={errores.password}>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className={claseInput(errores.password)}
          />
        </Campo>

        <Campo etiqueta="Confirmar Contraseña" error={errores.confirmarPassword}>
          <input
            name="confirmarPassword"
            type="password"
            value={form.confirmarPassword}
            onChange={handleChange}
            className={claseInput(errores.confirmarPassword)}
          />
        </Campo>
      </div>
      <Campo etiqueta="Institución / Empresa">
        <select
          name="institucion_id"
          value={form.institucion_id}
          onChange={handleChange}
          className={claseInput()}
        >
          <option value="">Seleccione una institución</option>
          {instituciones.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Carrera">
        <select
          name="carrera_id"
          value={form.carrera_id}
          onChange={handleChange}
          disabled={!form.institucion_id || cargandoCarreras}
          className={claseInput()}
        >
          <option value="">
            {cargandoCarreras
              ? "Cargando carreras..."
              : form.institucion_id
              ? "Seleccione una carrera"
              : "Primero seleccione una institución"}
          </option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Carnet (Si aplica)" error={errores.carnet}>
        <input
          name="carnet"
          value={form.carnet}
          onChange={handleChange}
          className={claseInput(errores.carnet)}
        />
      </Campo>

      <Campo etiqueta="Teléfono" error={errores.telefono}>
        <input
          name="telefono"
          value={form.telefono}
          onChange={handleChange}
          className={claseInput(errores.telefono)}
        />
      </Campo>

      <Campo etiqueta="Biografía" error={errores.biografia}>
        <textarea
          name="biografia"
          rows={3}
          value={form.biografia}
          onChange={handleChange}
          className={claseInput(errores.biografia)}
        />
      </Campo>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="acepta" type="checkbox" checked={form.acepta} onChange={handleChange} />
        Acepto los términos y condiciones
      </label>
      {errores.acepta && <p className="text-sm text-red-600">{errores.acepta}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      >
        {enviando ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes una cuenta?{" "}
        <button
          type="button"
          onClick={onCambiarVista}
          className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline cursor-pointer"
        >
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
