import { useEffect, useState } from "react";
import { apiFetch, setCsrfToken } from "./api/generic-api";
import Login from "./components/Login";
import MainPage from "./components/MainPage";
import Registro from "./components/Registro";

export default function App() {
  const [vista, setVista] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  // Al cargar la app: si la cookie de sesión sigue válida, se restaura el usuario
  useEffect(() => {
    const controlador = new AbortController();

    apiFetch("login.php", { signal: controlador.signal })
      .then((resultado) => {
        setUsuario(resultado.data);
        setVista("main-page");
      })
      .catch(() => {
        // Sin sesión: se queda en login
      })
      .finally(() => {
        if (!controlador.signal.aborted) setVerificando(false);
      });

    return () => controlador.abort();
  }, []);

  function handleLoginExitoso(datosUsuario) {
    setUsuario(datosUsuario);
    setVista("main-page");
  }

  async function handleLogout() {
    try {
      // DELETE exige sesión y X-CSRF-Token; el backend borra la cookie
      await apiFetch("login.php", { method: "DELETE" });
    } catch {
      // Aunque falle (cookie ya vencida), se limpia el estado local
    }
    setCsrfToken(null);
    setUsuario(null);
    setVista("login");
  }

  if (verificando) {
    return <p className="py-10 text-center text-slate-600">Cargando...</p>;
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
