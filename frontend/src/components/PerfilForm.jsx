import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import { RegisterContext } from "../context/RegisterContext";
import Campo from "../helpers/Campo";
import claseInput from "../helpers/claseInput";
import MensajeError from "./ui/MensajeError";
import Spinner from "./ui/Spinner";

// Pestaña "Mi Perfil": el usuario logueado edita sus propios datos.
//   1) Carga sus datos con  GET usuarios.php?id=X
//   2) Los guarda con       PUT usuarios.php
// Es el mismo patrón que Registro: form + handleChange + validar + handleSubmit.

const formVacio = {
  username: "",
  nombre: "",
  apellido: "",
  email: "",
  institucion_id: "",
  carrera_id: "",
  carnet: "",
  telefono: "",
  biografia: "",
};

export default function PerfilForm() {
  const { usuario, login } = useContext(AuthContext);
  // Reusamos las listas de instituciones y carreras que ya carga RegisterContext.
  const { instituciones, carreras, cargandoCarreras, setInstitucionId } = useContext(RegisterContext);

  const [form, setForm] = useState(formVacio);
  const [rolId, setRolId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }
  const [enviando, setEnviando] = useState(false);

  // Cargar los datos actuales del usuario
  useEffect(() => {
    const controlador = new AbortController();

    async function cargarPerfil() {
      try {
        const respuesta = await apiFetch(`usuarios.php?id=${usuario.id}`, {
          signal: controlador.signal,
        });
        const perfil = respuesta.data;

        //  La base de datos devuelve null en los campos vacíos
        // (ej: telefono = null). Un <input> con value={null} da advertencias en React,
        // convertimos cada null en "" con  "|| ''".
        setForm({
          username: perfil.username || "",
          nombre: perfil.nombre || "",
          apellido: perfil.apellido || "",
          email: perfil.email || "",
          institucion_id: perfil.institucion_id ? String(perfil.institucion_id) : "",
          carrera_id: perfil.carrera_id ? String(perfil.carrera_id) : "",
          carnet: perfil.carnet || "",
          telefono: perfil.telefono || "",
          biografia: perfil.biografia || "",
        });
        setRolId(perfil.rol_id);

        // Avisamos al contexto qué institución tiene, para que cargue sus carreras.
        setInstitucionId(perfil.institucion_id ? String(perfil.institucion_id) : "");
      } catch (err) {
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarPerfil();
    return () => controlador.abort();
  }, [usuario.id, setInstitucionId]);

  // ---------- 2) Cambios en los campos ----------
  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "institucion_id") {
      setInstitucionId(value); // recarga las carreras de la nueva institución
    }

    setForm((prev) => {
      const siguiente = { ...prev, [name]: value };
      // Si cambia la institución, la carrera anterior ya no sirve.
      if (name === "institucion_id") {
        siguiente.carrera_id = "";
      }
      return siguiente;
    });
  }

  // ---------- 3) Validación (mismas reglas que el backend) ----------
  function validar(datos) {
    const e = {};

    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(datos.username.trim())) {
      e.username = "De 3 a 50 caracteres: letras, números, punto, guion o guion bajo";
    }

    if (datos.nombre.trim().length < 2) {
      e.nombre = "El nombre debe tener al menos 2 caracteres";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.nombre.trim())) {
      e.nombre = "El nombre solo puede tener letras y espacios";
    }

    if (datos.apellido.trim().length < 2) {
      e.apellido = "El apellido debe tener al menos 2 caracteres";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(datos.apellido.trim())) {
      e.apellido = "El apellido solo puede tener letras y espacios";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) {
      e.email = "Email no válido";
    }

    if (datos.carnet.trim().length > 30) {
      e.carnet = "El carnet no puede exceder 30 caracteres";
    }

    if (datos.telefono.trim() && !/^[0-9+\-\s()]{7,30}$/.test(datos.telefono.trim())) {
      e.telefono = "Formato de teléfono no válido";
    }

    if (datos.biografia.length > 1000) {
      e.biografia = "La biografía no puede exceder los 1000 caracteres";
    }

    return e;
  }

  // ---------- 4) Enviar con PUT ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje(null);

    const validacionesErrores = validar(form);
    setErrores(validacionesErrores);
    if (Object.keys(validacionesErrores).length > 0) {
      return;
    }

    // ⚠️ IMPORTANTE: el PUT de usuarios.php necesita "id" y "rol_id" además de los campos.
    // - id: le dice al backend QUÉ usuario actualizar (sale del AuthContext).
    // - rol_id: el backend lo valida aunque no lo cambiemos (sale del GET inicial).
    const datos = {
      id: usuario.id,
      rol_id: rolId,
      username: form.username.trim(),
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      institucion_id: form.institucion_id,
      carrera_id: form.carrera_id,
      carnet: form.carnet.trim(),
      telefono: form.telefono.trim(),
      biografia: form.biografia.trim(),
    };

    try {
      setEnviando(true);
      await apiFetch("usuarios.php", { method: "PUT", body: datos });

      setMensaje({ tipo: "ok", texto: "Perfil actualizado correctamente" });

      // ⚠️ IMPORTANTE: actualizamos el usuario del AuthContext para que el Navbar
      // muestre el @username nuevo sin tener que recargar la página.
      login({
        ...usuario,
        username: datos.username,
        name: `${datos.nombre} ${datos.apellido}`,
      });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  // Dibujo martinez
  if (cargando) {
    return <Spinner texto="Cargando perfil..." />;
  }

  if (errorCarga) {
    return <MensajeError texto={errorCarga} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow"
    >
      <h2 className="text-xl font-bold text-slate-800">Mi Perfil</h2>

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

      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Institución / Empresa">
          <select
            name="institucion_id"
            value={form.institucion_id}
            onChange={handleChange}
            className={claseInput()}
          >
            <option value="">Sin institución</option>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Campo etiqueta="Biografía" error={errores.biografia}>
        <textarea
          name="biografia"
          rows={4}
          value={form.biografia}
          onChange={handleChange}
          className={claseInput(errores.biografia)}
        />
      </Campo>

      <button
        type="submit"
        disabled={enviando}
        className="w-full cursor-pointer rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
