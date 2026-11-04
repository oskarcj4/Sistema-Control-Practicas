import { useContext, useState } from "react";
import Login from "./components/Login";
import MainPage from "./components/MainPage";
import Registro from "./components/Registro";
import Spinner from "./components/ui/Spinner";
import { AuthContext } from "./context/AuthContext";

export default function App() {
  const [vista, setVista] = useState("login");
  const { usuario, cargando } = useContext(AuthContext);

  if (cargando) {
    return <Spinner texto="Cargando sesión..." />;
  }

  // Con sesión iniciada, MainPage ocupa toda la pantalla (Navbar de borde a borde).
  if (usuario) {
    return <MainPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {vista === "registro" ? (
        <Registro onCambiarVista={() => setVista("login")} />
      ) : (
        <Login onCambiarVista={() => setVista("registro")} />
      )}
    </div>
  );
}
