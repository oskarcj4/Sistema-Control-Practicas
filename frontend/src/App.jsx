import { useContext, useState } from "react";
import MainPage from "./components/MainPage";
import Registro from "./components/Registro";
import { AuthContext } from "./context/AuthContext";


export default function App() {
  const [vista, setVista] = useState("login");
  const [usuario, cargandos] = useContext(AuthContext);

  if(cargando){
    return <p className="py-10 text-center text-slate-600">Cargando sesion...</p>
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {usuario ? (
        <MainPage />
      ) : vista === "registro" ? (
        <Registro onCambiarVista={() => setVista("login")} />
      ) : (
        <Login onCambiarVista={() => setVista("registro")} />
      )}
    </div>
  );
}
