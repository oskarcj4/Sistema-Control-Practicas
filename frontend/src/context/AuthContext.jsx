import { createContext, useEffect, useState } from "react";
import { apiFetch, setCsrfToken } from "../api/generic-api";

export const AuthContext = createContext();

// Contexto Global para manejar el login

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();

    apiFetch("login.php", { signal: controlador.signal })
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      });

    return () => controlador.abort();
  }, []);

  async function login(datosUsuario) {
    setUser(datosUsuario);
  }

  async function logout() {
    try {
      await apiFetch("login.php", { method: "DELETE" });
    } catch {
      // Si la sesión ya expiró en PHP, ignoramos el fallo
    }
    setCsrfToken(null);
    setUser(null);
  }

  const valor = {
    user,
    usuario: user,
    cargando,
    autenticado: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}
