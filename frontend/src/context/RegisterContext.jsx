import { createContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import extraerLista from '../helpers/extraerLista';

export const RegisterContext = createContext();

export default function RegisterProvider({ children }) {
  const [cargandoInstituciones, setCargandoInstituciones] = useState(true);
  const [carreras, setCarreras] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [instituciones, setInstituciones] = useState([]);
  const [cargandoCarreras, setCargandoCarreras] = useState(false);
  const [institucionId, setInstitucionId] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    async function cargarInstituciones() {
      try {
        const datos = await apiFetch("instituciones.php?acotado=1", { signal });
        setInstituciones(extraerLista(datos));
      } catch (err) {
        if (err.name === "AbortError" || signal.aborted) {
          return;
        }
        setErrorCarga(err.message);
      } finally {
        if (!signal.aborted) {
          setCargandoInstituciones(false);
        }
      }
    }

    cargarInstituciones();
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (!institucionId) {
      setCarreras([]);
      return;
    }

    const controlador = new AbortController();
    const { signal } = controlador;

    async function cargarCarreras() {
      try {
        setCargandoCarreras(true);
        setErrorCarga(null);
        const datos = await apiFetch(`carreras.php?institucion_id=${encodeURIComponent(institucionId)}`, { signal });
        setCarreras(extraerLista(datos));
      } catch (err) {
        if (err.name === "AbortError") return;
        setCarreras([]);
        setErrorCarga(err.message);
      } finally {
        if (!signal.aborted) {
          setCargandoCarreras(false);
        }
      }
    }

    cargarCarreras();
    return () => controlador.abort();
  }, [institucionId]);

  const valor = {
    cargandoInstituciones,
    carreras,
    instituciones,
    cargandoCarreras,
    errorCarga,
    setInstitucionId,
  };

  return (
    <RegisterContext.Provider value={valor}>
      {children}
    </RegisterContext.Provider>
  );
}
