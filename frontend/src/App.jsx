import { useState } from "react";
import Login from "./components/Login";
import MainPage from "./components/MainPage";
import Registro from "./components/Registro";

export default function App() {
  const [vista, setVista] = useState("registro");
  const [usuario, setUsuario] = useState(null);

  function handleLoginExitoso(datosUsuario){
    setUsuario(datosUsuario);
    setVista("main-page");
  }

  function handleLogout(){
    setUsuario();
    setVista("login")
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {vista === "main-page" && usuario ? (
        <MainPage usuario={usuario} onLogout={handleLogout} />
      ) : vista === "registro" ? (
        <Registro onCambiarVista={() => setVista("login")} />
      ) : (
        <Login
          onCambiarVista={() => setVista("registro")}
          onLoginExitoso={handleLoginExitoso}
        />
      )}
    </div>
  );
}
