import { useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import Feed from "./Feed";
import { MisPostulaciones } from "./MisPostulaciones";
import Navbar from "./Navbar";
import NuevaOfertaForm from "./NuevaOfertaForm";
import PerfilPage from "./PerfilPage";
import TablaUsuarios from "./TablaUsuarios";

// Lista de pestañas del Navbar
const PESTANAS = [
  { id: "feed", texto: "Feed" },
  { id: "mis-postulaciones", texto: "Mis Postulaciones" },
  { id: "nueva-oferta", texto: "Nueva Oferta" },
  { id: "admin", texto: "Panel de Administración" },
  { id: "perfil", texto: "Mi Perfil" },
];

export default function MainPage() {
  const { usuario } = useContext(AuthContext);
  const [pestanaActiva, setPestanaActiva] = useState("feed");
  const [notificaciones, setNotificaciones] = useState([]);

  // Cargar notificaciones del usuario logueado
  useEffect(() => {
    if (!usuario?.id) return;
    const controller = new AbortController();

    async function cargarNotificaciones() {
      try {
        const res = await apiFetch(`notificaciones.php?usuario_id=${usuario.id}`, {
          signal: controller.signal,
        });
        setNotificaciones(res.data || []);
      } catch (err) {
        if (err.name === "AbortError") return;
        // Ignorar errores silenciosos de sondeo
      }
    }

    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 25000);
    return () => {
      controller.abort();
      clearInterval(intervalo);
    };
  }, [usuario?.id]);

  // Marcar una notificación como leída al hacer clic en ella
  async function handleMarcarLeida(notif) {
    if (Number(notif.leido) === 1) return;
    try {
      await apiFetch("notificaciones.php", {
        method: "PUT",
        body: {
          id: notif.id,
          titulo: notif.titulo,
          mensaje: notif.mensaje,
          leido: 1,
        },
      });
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, leido: 1 } : n))
      );
    } catch (err) {
      console.error("Error al marcar notificación:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar
        pestanas={PESTANAS}
        pestanaActiva={pestanaActiva}
        onCambiarPestana={setPestanaActiva}
        notificaciones={notificaciones}
        onClickNotificacion={handleMarcarLeida}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {pestanaActiva === "feed" && <Feed />}

        {pestanaActiva === "mis-postulaciones" && <MisPostulaciones />}

        {pestanaActiva === "nueva-oferta" && (
          <NuevaOfertaForm onOfertaCreada={() => setPestanaActiva("feed")} />
        )}

        {pestanaActiva === "admin" && <TablaUsuarios />}

        {pestanaActiva === "perfil" && <PerfilPage />}
      </main>
    </div>
  );
}
