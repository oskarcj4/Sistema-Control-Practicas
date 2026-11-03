import { useState } from "react";
import Registro from "./components/Registro";
import Login from "./components/Login";

export default function App() {
  const [vista, setVista] = useState("registro");

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {vista === "login" ? (
        <Login onCambiarVista={() => setVista("registro")} />
      ) : (
        <Registro onCambiarVista={() => setVista("login")} />
      )}
    </div>
  );
}
