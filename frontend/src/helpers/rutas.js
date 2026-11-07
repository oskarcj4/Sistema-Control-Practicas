import { useEffect, useState } from "react";

// Rutas con "#" (hash). No necesitan configurar el servidor y el enlace se puede
// copiar y compartir. El backend guarda estas mismas rutas en notificaciones.enlace
// (ver api/core/notificar.php).
//
//   #/feed                     pestaña Feed (por defecto)
//   #/mis-postulaciones, #/mis-ofertas, #/nueva-oferta, #/solicitud-publicacion,
//   #/buzon, #/perfil          resto de pestañas
//   #/admin/<seccion>          Panel de Administración en una sección
//   #/oferta/<id>              página propia de una oferta
//   #/usuario/<id>             perfil público de un usuario

// Convierte "#/admin/bitacora" en { pestana: "admin", parametro: "bitacora" }
export function leerRuta(hash = window.location.hash) {
  const partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return {
    pestana: partes[0] || "feed",
    parametro: partes[1] || "",
  };
}

export function irA(ruta) {
  const destino = ruta.startsWith("#") ? ruta : `#/${ruta}`;
  if (window.location.hash !== destino) {
    window.location.hash = destino;
  }
  window.scrollTo({ top: 0 });
}

// Enlace absoluto para compartir (incluye dominio y ruta del frontend)
export function enlaceCompleto(ruta) {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${ruta}`;
}

// Hook: devuelve la ruta actual y se actualiza con atrás/adelante del navegador
export function useRuta() {
  const [ruta, setRuta] = useState(() => leerRuta());

  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  return ruta;
}
