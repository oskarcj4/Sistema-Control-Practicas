import { useContext, useState } from "react";
import Login from "./components/Login";
import MainPage from "./components/MainPage";
import Registro from "./components/Registro";
import { AuthContext } from "./context/AuthContext";

export default function App() {
  const [vista, setVista] = useState("login");
  const { usuario, cargando } = useContext(AuthContext);

  if (cargando) {
    return <p className="py-10 text-center text-slate-600">Cargando sesión...</p>;
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
