import { useState } from "react";
import Navbar from "./Navbar";
import PerfilForm from "./PerfilForm";
import TablaUsuarios from "./TablaUsuarios";
import EstadoVacio from "./ui/EstadoVacio";

// Lista de pestañas del Navbar.
// T10 (tuya): filtra este arreglo según el rol del usuario
//    (ej: "nueva-oferta" solo Reclutador/Admin, "admin" solo Admin).
const PESTANAS = [
  { id: "feed", texto: "Feed" }, // todos
  { id: "mis-postulaciones", texto: "Mis Postulaciones" }, // todos
  { id: "nueva-oferta", texto: "Nueva Oferta" }, // solo reclutadores & admins
  { id: "admin", texto: "Panel de Administración" }, // solo admin
  { id: "perfil", texto: "Mi Perfil" }, // visible para todos los roles
];

export default function MainPage() {
  // Qué pestaña se está viendo ahora mismo.
  const [pestanaActiva, setPestanaActiva] = useState("feed");

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar
        pestanas={PESTANAS}
        pestanaActiva={pestanaActiva}
        onCambiarPestana={setPestanaActiva}
        notificaciones={[]} // T17: notificaciones
      />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Se muestra solo el bloque de la pestaña activa */}

        {pestanaActiva === "feed" && (
          // T3 / T4 / T6: aquí va el useEffect, el buscador, el .map() con <OportunidadCard />
          //   y el <DetalleModal />.
          <EstadoVacio
            icono="🔎"
            titulo="Feed de oportunidades"
            mensaje="Aquí se mostrarán las prácticas disponibles (pendiente T3)."
          />
        )}

        {pestanaActiva === "mis-postulaciones" && (
          // T9: aquí va la carga con useEffect y el .map() con <PostulacionCard />
          <EstadoVacio
            icono="📄"
            titulo="Mis postulaciones"
            mensaje="Aquí verás el estado de tus solicitudes (pendiente T9)."
          />
        )}

        {pestanaActiva === "nueva-oferta" && (
          // T11: formulario "Publicar Oportunidad"
          <EstadoVacio
            icono="📝"
            titulo="Publicar oportunidad"
            mensaje="Aquí irá el formulario para crear ofertas (pendiente T11)."
          />
        )}

        {pestanaActiva === "admin" && (<TablaUsuarios/>)}

        {pestanaActiva === "perfil" && <PerfilForm />}
      </main>
    </div>
  );
}
