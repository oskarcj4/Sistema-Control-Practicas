import { createContext, useEffect, useState } from "react";
import { apiFetch, setCsrfToken } from "../api/generic-api";

export const AuthContext = createContext();

// Contexto Global para manejar el login

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();

    apiFetch("login.php", { signal: controlador.signal })
      .then((res) => {
        setUsuario(res.data);
      })
      .catch(() => {
        setUsuario(null);
      })
      .finally(() => {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controlador.abort();
  }, []);

  async function login(datosUsuario) {
    setUsuario(datosUsuario);
  }

  async function logout() {
    try {
      await apiFetch("login.php", { method: "DELETE" });
    } catch {
      // Si la sesión ya expiró en PHP, ignoramos el fallo
    }
    setCsrfToken(null);
    setUsuario(null);
  }

  const valor = {
    usuario,
    cargando,
    autenticado: Boolean(usuario),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}
