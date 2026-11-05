import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import PostulacionCard from "./PostulacionCard";

export function MisPostulaciones() {
  const {usuario} = useContext(AuthContext);
  const[postulaciones, setPostulaciones] = useState([]);
  const[errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(()=>{
    const controller = new AbortController();
    async function cargarPostulaciones() {
      try{
        const response = await apiFetch(`postulaciones.php?estudiante_id=${usuario?.id}`, {signal : controller.signal});
        setPostulaciones(response.data);
      }
      catch(err){
        if(err.name === 'AbortError'){
          return;
      }
      setErrorCarga(err.message);
    }
    finally {
        if(!controller.signal.aborted){
          setCargando(false);
        }
      }

    }
    cargarPostulaciones();
    return () => controller.abort();
  }, [usuario])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Mis postulaciones</h2>
      {cargando &&  <p className="text-slate-500">Cargando oportunidades...</p>}
      {errorCarga && <p className="text-red-500">Error: {errorCarga}</p>}
      {!cargando && postulaciones.length === 0 && (
        <p className="text-slate-500">No hay oportunidades disponibles en este momento.</p>
      )}
      <div className="flex w-full flex-col gap-5">
        {
          postulaciones.map((po)=>{

            return (<PostulacionCard
                postulacion={po}
                onVerHistorial={() => set}
            />);
          })
        }
      </div>
    </div>

  );

}
