import { useEffect, useState } from "react";
import AvisosMasivos from "./AvisosMasivos";
import Bitacora from "./Bitacora";
import InicioAdmin from "./InicioAdmin";
import { apiFetch } from "../api/generic-api";
import BuzonSolicitudes from "./BuzonSolicitudes";
import CrudCatalogo from "./CrudCatalogo";
import PermisosPublicacion from "./PermisosPublicacion";
import TablaUsuarios from "./TablaUsuarios";

// Panel de administración con sub-secciones.
// Para agregar una sección nueva, agrega una entrada a SECCIONES y su render abajo.
const SECCIONES = [
  { id: "inicio", texto: "Inicio" },
  { id: "solicitudes", texto: "Solicitudes de publicación" },
  { id: "usuarios", texto: "Usuarios" },
  { id: "permisos", texto: "Permisos de publicación" },
  { id: "instituciones", texto: "Instituciones" },
  { id: "carreras", texto: "Carreras" },
  { id: "roles", texto: "Roles" },
  { id: "avisos", texto: "Avisos masivos" },
  { id: "bitacora", texto: "Bitácora" },
];

const TIPOS_INSTITUCION = [
  { valor: "universidad", texto: "Universidad" },
  { valor: "empresa", texto: "Empresa" },
  { valor: "startup_estudiantil", texto: "Startup estudiantil" },
  { valor: "otra", texto: "Otra" },
];

// Props:
//   seccion          -> id de la sección (sale de la URL #/admin/<seccion>); vacío = inicio
//   onCambiarSeccion -> función(id) que cambia la URL
export default function PanelAdmin({ seccion: seccionRuta, onCambiarSeccion }) {
  const seccion = SECCIONES.some((s) => s.id === seccionRuta) ? seccionRuta : "inicio";
  const setSeccion = onCambiarSeccion;
  const [instituciones, setInstituciones] = useState([]);

  // Las carreras necesitan la lista de instituciones para el select y para mostrar el nombre
  useEffect(() => {
    if (seccion !== "carreras") return;
    const controller = new AbortController();
    apiFetch("instituciones.php", { signal: controller.signal })
      .then((res) => setInstituciones(res.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, [seccion]);

  const nombreInstitucion = (id) =>
    instituciones.find((i) => Number(i.id) === Number(id))?.nombre || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeccion(s.id)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition ${
              seccion === s.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s.texto}
          </button>
        ))}
      </div>

      {seccion === "inicio" && <InicioAdmin />}

      {seccion === "solicitudes" && <BuzonSolicitudes />}

      {seccion === "avisos" && <AvisosMasivos />}

      {seccion === "bitacora" && <Bitacora />}

      {seccion === "usuarios" && <TablaUsuarios />}

      {seccion === "permisos" && <PermisosPublicacion />}

      {seccion === "instituciones" && (
        <CrudCatalogo
          titulo="Instituciones"
          endpoint="instituciones.php"
          campos={[
            { nombre: "nombre", etiqueta: "Nombre", requerido: true },
            { nombre: "siglas", etiqueta: "Siglas" },
            { nombre: "tipo", etiqueta: "Tipo", tipo: "select", requerido: true, opciones: TIPOS_INSTITUCION },
            { nombre: "contacto_email", etiqueta: "Email de contacto", tipo: "email" },
            { nombre: "sitio_web", etiqueta: "Sitio web", tipo: "url" },
          ]}
          columnas={[
            { etiqueta: "Nombre", valor: (f) => f.nombre },
            { etiqueta: "Siglas", valor: (f) => f.siglas },
            { etiqueta: "Tipo", valor: (f) => TIPOS_INSTITUCION.find((t) => t.valor === f.tipo)?.texto || f.tipo },
            { etiqueta: "Contacto", valor: (f) => f.contacto_email },
          ]}
        />
      )}

      {seccion === "carreras" && (
        <CrudCatalogo
          titulo="Carreras"
          endpoint="carreras.php"
          campos={[
            {
              nombre: "institucion_id",
              etiqueta: "Institución",
              tipo: "select",
              requerido: true,
              opciones: instituciones.map((i) => ({ valor: String(i.id), texto: i.nombre })),
            },
            { nombre: "nombre", etiqueta: "Nombre", requerido: true },
            { nombre: "codigo", etiqueta: "Código" },
          ]}
          columnas={[
            { etiqueta: "Nombre", valor: (f) => f.nombre },
            { etiqueta: "Código", valor: (f) => f.codigo },
            { etiqueta: "Institución", valor: (f) => f.institucion || nombreInstitucion(f.institucion_id) },
          ]}
        />
      )}

      {seccion === "roles" && (
        <CrudCatalogo
          titulo="Roles"
          endpoint="roles.php"
          campos={[
            { nombre: "nombre", etiqueta: "Nombre", requerido: true },
            { nombre: "descripcion", etiqueta: "Descripción" },
          ]}
          columnas={[
            { etiqueta: "ID", valor: (f) => String(f.id) },
            { etiqueta: "Nombre", valor: (f) => f.nombre },
            { etiqueta: "Descripción", valor: (f) => f.descripcion },
          ]}
        />
      )}
    </div>
  );
}
