import { createContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";

export const AuthContext = createContext();

// Contexto Global para manejar el login

export default function AuthProvider(){
  const [user, setUser] = useState(null);
  const[cargando, setCargando] = useState(true);

  useEffect(()=>{
    const controlador = new AbortController({children});
    try{
      const res = apiFetch("login.php", {signal :controlador.signal});
      data= res.data;
    }
    catch{
      setUser(null);
    }
    finally{
      setCargando(false);
    }

    return () => controlador.abort;

  },[])

  async function login(datosUsuario){
    setUser(datosUsuario);
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
    // El createContext tiene 2 parametros, un .Provider y un .Consumer
    // Provider: Emite a los datos al {children}, en este caso es cualquier descendiente del
    // AuthContext, y lo que vamos a mandar es el array de datos "valor"

    // EXTRA: .Consumer es la forma antigua que diseño React para leer los datos de un contexto.
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}
