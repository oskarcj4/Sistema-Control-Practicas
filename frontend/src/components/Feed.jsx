import { useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import OportunidadCard from "./OportunidadCard";

export default function Feed() {
  const [oportunidades, setOportunidades] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function cargarFeed(){
      try{
        const response = await apiFetch("oportunidades.php", {signal: controller.signal});
        setOportunidades(response.data);
      }catch (err){
        if (err.name === "AbortError") return;
        setErrorCarga(err.message);
      }
      finally{
        if(!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarFeed();
    return () => controller.abort();
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Feed Practicas</h2>
      {cargando && <p className="text-slate-500">Cargando oportunidades</p> }
      {errorCarga && <p className="text-red-500"> Error {errorCarga} </p> }

        {oportunidades.map((op) => {
          return (<OportunidadCard
            key={op.id}
            oportunidad={op}
            onVerMas={() => console.log("Clic en: ", op.titulo)}
          />);
        })}
    </div>
  );
}
