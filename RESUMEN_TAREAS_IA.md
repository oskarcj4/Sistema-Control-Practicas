# Resumen de lo implementado por la IA

Este documento explica **qué hizo la IA** de la lista de tareas (T1–T20), **dónde está cada archivo**, **cómo se usa** y **qué te toca a ti (👤)**.

- No se tocó nada del backend (`api/`).
- Todo el código está en `frontend/src/`.
- Se priorizó que el código sea **fácil de leer**, no que sea el más corto o eficiente.
- Los componentes de la IA **solo dibujan** (son "visuales"). Reciben los datos por **props** y avisan de los clics con funciones (`onAlgo`). **Ninguno llama a la API**: esa parte es tuya.

> ⚠️ Las partes marcadas con **⚠️ IMPORTANTE** son las más difíciles de entender. Léelas con calma. En el código también tienen un comentario `⚠️ IMPORTANTE`.

Para probar: `cd frontend` → `npm run dev` → abre `http://localhost:5173`.

---

## 1. Lista de archivos

| Tarea | Archivo | Estado |
|---|---|---|
| Ayuda | `src/helpers/estilos.js` | Nuevo |
| T1 | `src/components/Navbar.jsx` | Nuevo |
| T2 | `src/components/OportunidadCard.jsx` | Nuevo |
| T5 | `src/components/DetalleModal.jsx` | Nuevo |
| T9 (parte visual) | `src/components/PostulacionCard.jsx` | Nuevo |
| T12 (parte visual) | `src/components/TablaPostulantes.jsx` | Nuevo |
| T14 (parte visual) | `src/components/AsignarRolModal.jsx` | Nuevo |
| T15 (parte visual) | `src/components/TablaUsuarios.jsx` | Nuevo |
| T17 (parte visual) | `src/components/NotificacionesDropdown.jsx` | Nuevo |
| T19 (parte visual) | `src/components/HistorialTimeline.jsx` | Nuevo |
| T20 | `src/components/ui/Spinner.jsx` | Nuevo |
| T20 | `src/components/ui/EstadoVacio.jsx` | Nuevo |
| T20 | `src/components/ui/MensajeError.jsx` | Nuevo |
| Extra | `src/components/PerfilForm.jsx` (pestaña "Mi Perfil") | Nuevo |
| T1 | `src/components/MainPage.jsx` | Modificado |
| T1 / T20 | `src/App.jsx` | Modificado |

---

## 2. `helpers/estilos.js` — colores y textos compartidos

Muchos componentes necesitan saber "¿qué color le pongo a *remoto*?" o "¿qué texto muestro para *en_revision*?". En vez de repetir `if` en cada archivo, todo está aquí en **objetos tipo diccionario**:

```js
COLOR_MODALIDAD["remoto"]              // "bg-green-100 text-green-700"
TEXTO_ESTADO_POSTULACION["aceptada"]   // "🟢 Aceptada"
TEXTO_ROL[3]                           // "Reclutador"
```

Se lee así: `OBJETO[clave]` devuelve el valor de esa clave. Si la clave no existe devuelve `undefined`, por eso en los componentes verás `COLOR_MODALIDAD[x] || "bg-slate-100..."` (un color por defecto).

Colores pedidos:
- Modalidad: **Remoto = verde**, **Presencial = azul**, **Híbrido = morado**.
- Postulación: **pendiente 🟡**, **en_revision 🔵**, **aceptada 🟢**, **rechazada 🔴**.

También trae dos funciones:

- `obtenerRoles(usuario)` → convierte `"1,3"` (texto que manda `login.php`) en `[1, 3]`.
  - Úsala en **T10**: `obtenerRoles(usuario).includes(ROL_RECLUTADOR)`.
- `formatearFecha("2026-11-04 10:30:00")` → `"04/11/2026"`.

Constantes de roles (vienen del seed de `init.sql`): `ROL_ESTUDIANTE = 1`, `ROL_ADMIN = 2`, `ROL_RECLUTADOR = 3`.

---

## 3. T1 — `Navbar.jsx`

Muestra:
- El logo "SP" y el nombre del sistema.
- `@username` y un **badge de rol** (Estudiante / Reclutador / Admin).
- La campana de notificaciones (T17).
- El botón **Cerrar sesión**: llama a `logout()` del `AuthContext`.
- Las **pestañas** para cambiar de pantalla.

El usuario y `logout` se leen directo del contexto con `useContext(AuthContext)`, igual que ya hacías en `Login.jsx`.

**¿Qué badge se muestra si el usuario tiene varios roles?** El más importante: Admin > Reclutador > Estudiante.

Props:

| Prop | Qué es |
|---|---|
| `pestanas` | Arreglo `[{ id: "feed", texto: "Feed" }, ...]` |
| `pestanaActiva` | El `id` de la pestaña seleccionada |
| `onCambiarPestana` | Función que recibe el `id` de la pestaña clicada |
| `notificaciones` | (opcional) arreglo para la campana |
| `onClickNotificacion` | (opcional) función al clicar una notificación |

> ⚠️ **IMPORTANTE — cómo funcionan las pestañas sin React Router**
> En `MainPage.jsx` hay un estado `pestanaActiva`. El Navbar no "navega": solo llama `onCambiarPestana("feed")`, que en realidad es `setPestanaActiva("feed")`. Luego `MainPage` usa **renderizado condicional**:
> ```jsx
> {pestanaActiva === "feed" && <MiFeed />}
> ```
> Si la condición es `true`, se dibuja lo de la derecha del `&&`; si es `false`, no se dibuja nada.

### Lo que hice en `MainPage.jsx`
- Lista `PESTANAS` con 4 pestañas: Feed, Mis Postulaciones, Nueva Oferta, Panel de Administración.
- Estado `pestanaActiva` y el `<Navbar />` conectado.
- Cada pestaña muestra un **EstadoVacio** con el texto "pendiente Tx". Ahí reemplazas con tu código.
- Comentarios `👤 Tx` marcan dónde va cada tarea tuya.

👤 **T10 (tuya):** hoy se ven las 4 pestañas para todos. Tú debes filtrar `PESTANAS` según el rol. Pista:
```js
const roles = obtenerRoles(usuario);
const pestanasVisibles = PESTANAS.filter((p) => {
  if (p.id === "admin") return usuario.isAdmin;
  // ...
  return true;
});
```

### Lo que cambié en `App.jsx`
- Mientras se revisa la sesión se muestra el `<Spinner />` (antes era un texto).
- Con sesión iniciada se devuelve `<MainPage />` **directamente**, sin el `py-10` que tenía el contenedor. Así el Navbar queda pegado arriba de borde a borde.
- Login y Registro siguen igual.

---

## 4. T2 — `OportunidadCard.jsx`

Tarjeta de una oferta: tag de modalidad con color, título, institución, carrera, descripción corta, fecha límite y botón **Ver más**.

```jsx
<OportunidadCard
  oportunidad={op}
  onVerMas={() => setOportunidadSeleccionada(op)}
/>
```

Campos que lee (vienen de `GET oportunidades.php`): `titulo`, `institucion`, `carrera`, `modalidad`, `fecha_cierre`, `descripcion`.

Detalle Tailwind: `line-clamp-2` corta la descripción a 2 líneas y agrega "...".

👤 **T3 (tuya):** en el feed haces el `.map()`:
```jsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {oportunidades.map((op) => (
    <OportunidadCard key={op.id} oportunidad={op} onVerMas={...} />
  ))}
</div>
```
Recuerda el `key={op.id}`: React lo necesita para saber qué tarjeta es cuál.

---

## 5. T5 — `DetalleModal.jsx`

Ventana flotante con fondo oscuro, botón X, descripción completa, requisitos, ubicación y fecha límite.

```jsx
<DetalleModal
  oportunidad={oportunidadSeleccionada}
  onCerrar={() => setOportunidadSeleccionada(null)}
>
  <PostularseForm oportunidad={oportunidadSeleccionada} />   {/* T7, tuyo */}
</DetalleModal>
```

> ⚠️ **IMPORTANTE — `if (!oportunidad) return null;`**
> Si `oportunidad` es `null`, el componente **no dibuja nada**. Por eso en T6 solo tienes que cambiar el estado: `null` = cerrado, un objeto = abierto. No necesitas un estado extra tipo `modalAbierto`.

> ⚠️ **IMPORTANTE — las dos capas del modal y `stopPropagation`**
> 1. **Capa de fondo**: `fixed inset-0 bg-black/50 z-50`. `fixed inset-0` la estira a toda la pantalla. `bg-black/50` = negro al 50 % de transparencia. Tiene `onClick={onCerrar}`: clic afuera = cerrar.
> 2. **Caja blanca**: está *dentro* del fondo. En HTML, un clic en un hijo **también "sube" (se propaga)** al padre. Sin protección, clicar dentro del formulario cerraría el modal.
>    Por eso la caja tiene `onClick={(e) => e.stopPropagation()}`: "este clic se queda aquí, no subas".

> ⚠️ **IMPORTANTE — `children`**
> Todo lo que pones **entre** `<DetalleModal>` y `</DetalleModal>` llega al componente como la prop especial `children`, y el modal lo dibuja al final. Así el modal no necesita saber nada del formulario de postulación.

Otros detalles: `max-h-[90vh] overflow-y-auto` hace que si el texto es largo, el modal tenga scroll propio. `whitespace-pre-line` respeta los saltos de línea de la descripción.

---

## 6. T9 — `PostulacionCard.jsx` (parte visual)

Muestra: título de la oferta, fecha de postulación, enlace al CV y **badge de estado** con color.

```jsx
{postulaciones.map((p) => (
  <PostulacionCard key={p.id} postulacion={p} />
))}
```

Campos que lee (de `GET postulaciones.php?estudiante_id=X`): `oportunidad`, `fecha_postulacion`, `estado_postulacion`, `cv_url`.

Prop opcional `onVerHistorial`: si la pasas, aparece un botón **Historial** (útil para T19). Si no, el botón no se muestra.

👤 Tuyo: el `useEffect` que carga los datos usando `usuario.id` del contexto.

---

## 7. T12 / T13 — `TablaPostulantes.jsx` (parte visual)

Tabla con: estudiante (nombre, email, carnet), fecha, enlaces a CV y constancia, mensaje de presentación, estado y botones **Aceptar / Rechazar**.

```jsx
<TablaPostulantes
  postulantes={lista}
  onAceptar={(p) => cambiarEstado(p, "aceptada")}    // T13 tuyo (PUT)
  onRechazar={(p) => cambiarEstado(p, "rechazada")}  // T13 tuyo (PUT)
/>
```

- Si **no** pasas `onAceptar` ni `onRechazar`, la columna "Acciones" desaparece.
- `overflow-x-auto` + `min-w-[700px]`: en celular la tabla se desliza de lado en vez de romper la página.

> ⚠️ **IMPORTANTE — `onClick={() => onAceptar(p)}` y no `onClick={onAceptar(p)}`**
> Con la flecha, la función se ejecuta **cuando haces clic**. Sin la flecha, se ejecutaría **al dibujar la tabla**, una vez por cada fila. Error muy común.

Nota: el backend (`postulaciones.php`) no devuelve la carrera del estudiante. La tabla la muestra **solo si existe** el campo `carrera`, así que no falla.

---

## 8. T14 — `AsignarRolModal.jsx` (parte visual)

Modal que muestra los **roles secundarios** del usuario como "chips" con una X para quitarlos, y un `<select>` + botón **Asignar** para agregar uno nuevo.

```jsx
<AsignarRolModal
  usuario={usuarioEditando}                 // null = cerrado
  rolesAsignados={asignaciones}             // GET asignaciones_roles.php?id_usuario=X
  rolesDisponibles={[
    { id: 1, nombre: "estudiante" },
    { id: 2, nombre: "administrador" },
    { id: 3, nombre: "reclutador" },
  ]}                                        // o lo que devuelva GET roles.php
  onAsignar={(idRol) => ...}                // tu POST
  onQuitar={(idRol) => ...}                 // tu DELETE ?id_usuario=X&id_rol=Y
  onCerrar={() => setUsuarioEditando(null)}
/>
```

> ⚠️ **IMPORTANTE — relación muchos a muchos en el frontend**
> Un usuario puede tener **muchos** roles y un rol puede tener **muchos** usuarios. La tabla `asignaciones_roles` guarda pares `(id_usuario, id_rol)`.
> Para no ofrecer en el `<select>` un rol que el usuario **ya tiene**, el modal hace:
> ```js
> const idsAsignados = rolesAsignados.map((a) => Number(a.id_rol));       // ej: [3]
> const rolesQueFaltan = rolesDisponibles.filter(
>   (rol) => !idsAsignados.includes(Number(rol.id))                       // quita el 3
> );
> ```
> 1. `.map()` saca solo los ids de los roles que ya tiene.
> 2. `.filter()` se queda con los roles cuyo id **no** está (`!`) en esa lista.
> Se usa `Number(...)` porque a veces el backend manda los ids como texto (`"3"`) y `"3" !== 3`.

Después de tu POST/DELETE, **vuelve a cargar** `rolesAsignados` para que el modal se actualice.

El modal tiene su propio estado `rolElegido` (lo que está seleccionado en el `<select>`). Es local: solo le importa a este componente.

---

## 9. T15 — `TablaUsuarios.jsx` (parte visual)

Tabla con nombre, `@username`, email, rol principal, institución/carrera, fecha de registro, badge **Activo / Suspendido** y botones.

```jsx
<TablaUsuarios
  usuarios={usuarios}                                // GET usuarios.php
  onCambiarEstado={(u) => ...}                      // tu PUT (activo <-> suspendido)
  onGestionarRoles={(u) => setUsuarioEditando(u)}   // abre AsignarRolModal
/>
```

El botón cambia solo según el estado: si `u.estado === "activo"` dice **Suspender** (rojo); si no, **Reactivar** (verde).

---

## 10. T17 — `NotificacionesDropdown.jsx` (parte visual)

Ya está **dentro del Navbar**. Es la campana 🔔 con:
- Insignia roja con el número de **no leídas** (`leido == 0`). Si es 0, no se ve.
- Al hacer clic se abre/cierra un menú con las notificaciones. Las no leídas tienen fondo azul claro.

Se alimenta desde `MainPage` → `Navbar` → `NotificacionesDropdown`. Hoy `MainPage` le pasa `notificaciones={[]}`.

👤 **T17 tuyo:** cargar las notificaciones con `useEffect` en `MainPage` y pasarlas a `<Navbar notificaciones={...} />`.
👤 **T18 tuyo:** pasar `onClickNotificacion={(n) => ...}` al Navbar, hacer el PUT y recargar la lista. El contador baja solo, porque se calcula desde la lista.

> ⚠️ **IMPORTANTE — "relative" + "absolute"**
> El contenedor de la campana tiene `relative` y el menú tiene `absolute right-0`. Un elemento `absolute` se posiciona respecto al ancestro `relative` más cercano. Resultado: el menú aparece justo debajo de la campana, alineado a la derecha, y flota encima del contenido sin empujarlo.

> ⚠️ **IMPORTANTE — estado derivado**
> `noLeidas` **no es un useState**. Se calcula en cada render:
> ```js
> const noLeidas = notificaciones.filter((n) => Number(n.leido) === 0).length;
> ```
> Si guardaras el número en otro estado, tendrías que acordarte de actualizarlo cada vez. Calculándolo, siempre está correcto. Es la misma idea que usarás en **T4** (buscador): no guardes la lista filtrada en un estado, calcúlala con `.filter()`.

---

## 11. T19 — `HistorialTimeline.jsx` (parte visual)

Línea de tiempo vertical. Cada punto muestra la fecha, el cambio `🟡 Pendiente → 🔵 En revisión`, el comentario del evaluador y quién lo hizo.

```jsx
<HistorialTimeline historial={lista} />   // GET historial_estado_postulacion.php?postulacion_id=X
```

Si la lista está vacía muestra "Todavía no hay cambios de estado."

> ⚠️ **IMPORTANTE — cómo se dibuja la línea**
> La `<ol>` tiene `border-l-2` → ese borde izquierdo **es** la línea vertical. Cada `<li>` tiene un `<span>` redondo (`rounded-full`) con `absolute -left-[9px]`, que lo mueve a la izquierda justo encima de la línea. Es solo CSS, no hay lógica.

Idea para usarlo: abrirlo dentro de un modal cuando se hace clic en "Historial" de `PostulacionCard`.

---

## 12. T20 — Spinner, EstadoVacio y MensajeError (`components/ui/`)

```jsx
{cargando && <Spinner texto="Cargando ofertas..." />}

{error && <MensajeError texto={error} />}

{!cargando && lista.length === 0 && (
  <EstadoVacio
    icono="📭"
    titulo="Aún no te has postulado a ninguna práctica"
    mensaje="Ve al Feed y encuentra una oferta para ti."
  />
)}
```

- `Spinner`: círculo gris con un borde morado que gira con `animate-spin` (animación que ya trae Tailwind).
- `EstadoVacio`: caja con borde punteado, icono grande, título y mensaje.
- `MensajeError`: caja roja, igual estilo que el error de Login/Registro.

Ya se usan en `App.jsx` (spinner al revisar sesión) y en `MainPage.jsx` (estado vacío de cada pestaña).

Mensajes sugeridos:
- Feed sin resultados: "No hay ofertas para esta carrera todavía".
- Mis postulaciones vacío: "Aún no te has postulado a ninguna práctica".
- Postulantes vacío: "Nadie se ha postulado a esta oferta todavía".

---

## 13. Patrón que se repite en todos los componentes

1. **Datos entran por props** (`oportunidad`, `postulantes`, `usuarios`...).
2. **Acciones salen por funciones** (`onVerMas`, `onAceptar`, `onCerrar`...). El componente no sabe qué hace la función, solo la llama.
3. **Si una función opcional no se pasa, el botón no aparece.** Ej: `{onAceptar && <button>...}`.
4. **Componentes "modal" reciben `null` para estar cerrados** (`DetalleModal`, `AsignarRolModal`).

Así tú haces la lógica (API, `useEffect`, estados) en la pantalla, y los componentes visuales se quedan simples.

---

## 13.1 Extra — Pestaña "Mi Perfil" (`PerfilForm.jsx`)

Esta pestaña **sí** está completa (con lógica y llamadas a la API), porque se pidió aparte. Es visible para **todos los roles** (en T10 no la filtres).

Flujo:
1. **Al abrir la pestaña** → `useEffect` hace `GET usuarios.php?id=<usuario.id>` y llena el formulario.
2. **El usuario edita** → `handleChange` (igual que en Registro, incluidos los selects en cascada institución → carrera).
3. **Guardar** → `validar()` con las mismas reglas del backend → `PUT usuarios.php`.
4. **Si sale bien** → mensaje verde y se actualiza el `AuthContext`, así el Navbar muestra el `@username` nuevo al instante.

Campos editables: username, nombre, apellido, email, institución, carrera, carnet, teléfono y biografía. **No** se edita: rol, estado de cuenta ni contraseña (el PUT del backend no cambia la contraseña).

Reutiliza `RegisterContext` para las listas de instituciones y carreras: no se repite la carga.

> ⚠️ **IMPORTANTE — `null` vs `""`**
> La base de datos manda `null` en campos vacíos (ej: `telefono: null`). Un `<input value={null}>` hace que React se queje (pasa de "no controlado" a "controlado"). Por eso al llenar el form se usa `perfil.telefono || ""`.

> ⚠️ **IMPORTANTE — lo que exige el PUT del backend**
> - `id`: qué usuario actualizar. Se toma de `usuario.id` (AuthContext). El backend **rechaza** el PUT si un no-admin manda un `id` que no es el suyo.
> - `rol_id`: el backend lo valida aunque no se cambie. Se guarda del GET inicial en el estado `rolId` y se reenvía igual.
> - El token CSRF lo agrega `apiFetch` solo, porque el método es `PUT`.

> ⚠️ **IMPORTANTE — `login({...usuario, username, name})`**
> `login()` del AuthContext solo hace `setUser(...)`. Lo usamos para reemplazar el usuario guardado en memoria por una copia (`...usuario`) con el username y nombre nuevos.

Limitaciones del backend (no se tocaron):
- Si guardas **sin cambiar nada**, el backend responde `"Usuario no encontrado o sin cambios"` (mensaje rojo). No es un fallo del frontend: MySQL dice que no se modificó ninguna fila.
- La cookie de sesión guarda el username con el que iniciaste sesión. Si cambias el username y **recargas la página**, el Navbar vuelve a mostrar el viejo hasta que cierres sesión y entres de nuevo.

---

## 14. Verificación

- `vite build` compila sin errores.
- `oxlint`: los archivos nuevos no tienen advertencias. Las advertencias que aparecen son de archivos que ya existían (`Registro.jsx`, `AuthContext.jsx`, `RegisterContext.jsx`) y no se tocaron.
- No se modificó nada en `api/`.

## 15. Lo que te queda (👤)

T3, T4, T6, T7, T8, carga de T9, T10, T11, carga de T12, T13, llamadas POST/DELETE de T14, PUT de T15, T16, carga de T17, T18 y carga de T19.
