import { useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/generic-api";
import { AuthContext } from "../context/AuthContext";
import BuzonNotificaciones from "./BuzonNotificaciones";
import Feed from "./Feed";
import MisOfertas from "./MisOfertas";
import { MisPostulaciones } from "./MisPostulaciones";
import Navbar from "./Navbar";
import NuevaOfertaForm from "./NuevaOfertaForm";
import PerfilPage from "./PerfilPage";
import SolicitudPublicacionForm from "./SolicitudPublicacionForm";
import PanelAdmin from "./PanelAdmin";

// Lista de pestañas del Navbar
const PESTANAS = [
  { id: "feed", texto: "Feed" },
  { id: "mis-postulaciones", texto: "Mis Postulaciones" },
  { id: "mis-ofertas", texto: "Mis Ofertas" },
  { id: "nueva-oferta", texto: "Nueva Oferta" },
  { id: "solicitud-publicacion", texto: "Solicitud de Publicación" },
  { id: "admin", texto: "Panel de Administración" },
  { id: "buzon", texto: "Buzón" },
  { id: "perfil", texto: "Mi Perfil" },
];

export default function MainPage() {
  const { usuario } = useContext(AuthContext);
  const [pestanaActiva, setPestanaActiva] = useState("feed");
  const [notificaciones, setNotificaciones] = useState([]);

  const usuarioId = usuario?.id;

  // Notificaciones del usuario logueado (GET sin usuario_id = las propias).
  // MainPage es dueño de la lista: la campana y el buzón leen el mismo estado.
  const cargarNotificaciones = useCallback(async (signal) => {
    try {
      const res = await apiFetch("notificaciones.php", { signal });
      setNotificaciones(res.data || []);
    } catch (err) {
      if (err.name === "AbortError") return;
      // Errores del sondeo se ignoran: se reintenta en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    if (!usuarioId) return;
    const controller = new AbortController();
    cargarNotificaciones(controller.signal);
    const intervalo = setInterval(() => cargarNotificaciones(controller.signal), 25000);
    return () => {
      controller.abort();
      clearInterval(intervalo);
    };
  }, [usuarioId, cargarNotificaciones]);

  // PUT accion=leer: marca una como leída (1) o no leída (0)
  async function marcarLeida(notif, leido = 1) {
    if (Number(notif.leido) === leido) return;
    try {
      await apiFetch("notificaciones.php", {
        method: "PUT",
        body: { accion: "leer", id: notif.id, leido },
      });
      setNotificaciones((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leido } : n)));
    } catch (err) {
      console.error("Error al marcar notificación:", err);
    }
  }

  // PUT accion=leer_todas: el backend usa el usuario de la sesión
  async function marcarTodas() {
    try {
      await apiFetch("notificaciones.php", { method: "PUT", body: { accion: "leer_todas" } });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: 1 })));
    } catch (err) {
      console.error("Error al marcar notificaciones:", err);
    }
  }

  async function eliminarNotificacion(notif) {
    try {
      await apiFetch(`notificaciones.php?id=${notif.id}`, { method: "DELETE" });
      setNotificaciones((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar
        pestanas={PESTANAS}
        pestanaActiva={pestanaActiva}
        onCambiarPestana={setPestanaActiva}
        notificaciones={notificaciones}
        onClickNotificacion={(n) => marcarLeida(n, 1)}
        onMarcarTodas={marcarTodas}
        onVerBuzon={() => setPestanaActiva("buzon")}
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {pestanaActiva === "feed" && <Feed />}

        {pestanaActiva === "mis-postulaciones" && <MisPostulaciones />}

        {pestanaActiva === "nueva-oferta" && (
          <NuevaOfertaForm onOfertaCreada={() => setPestanaActiva("mis-ofertas")} />
        )}

        {pestanaActiva === "mis-ofertas" && (
          <MisOfertas onNuevaOferta={() => setPestanaActiva("nueva-oferta")} />
        )}

        {pestanaActiva === "solicitud-publicacion" && (
          <SolicitudPublicacionForm />
        )}

        {pestanaActiva === "admin" && <PanelAdmin />}

        {pestanaActiva === "buzon" && (
          <BuzonNotificaciones
            notificaciones={notificaciones}
            onMarcarLeida={marcarLeida}
            onMarcarTodas={marcarTodas}
            onEliminar={eliminarNotificacion}
          />
        )}

        {pestanaActiva === "perfil" && <PerfilPage />}
      </main>
    </div>
  );
}
