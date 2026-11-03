import { useState } from "react";

const BASE_API = "http://localhost/SistemaControlPracticas/api/endpoints";

const datosIniciales = {
  identificador : "",
  contrasena : ""
};

export default function Login(){
  const [form, setForm] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [errorCarga, setErrorCarga] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(true);


  function validar(datos) {
    const e = {};

    if (!datos.identificador || datos.identificador.trim().length < 3) {
      e.identificador = "El nombre de usuario debe tener al menos 3 caracteres";
    } else if (datos.identificador.trim().length > 50) {
      e.identificador = "El nombre de usuario no puede exceder 50 caracteres";
    } else if (!/^[a-zA-Z0-9_]+$/.test(datos.identificador.trim())) {
      e.identificador = "Solo se permiten letras, números y guiones bajos";
    }

    if (!datos.password || datos.password.length < 8) {
      e.password = "La contraseña debe tener al menos 8 caracteres";
    }
  }


  async function handleSubmit(e){
    e.preventDefault();
    setMensaje(null);
    const validacionesErrores = validar(form);
    setErrores(validacionesErrores);

    if(Object.keys(validacionesErrores).length >0){
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([clave, valor]) => {
      formData.append(clave, valor);
    }
    );


  }
}
