# Subida de archivos y formulario de postulación

Este documento explica cómo el backend recibe el formulario de postulación con archivos (CV y constancia de estudios), dónde guarda los archivos, cómo los valida y cómo se cambia el destino (carpeta local o Amazon S3) editando solo el `.env`.

---

## Índice

1. [Resumen](#1-resumen)
2. [Flujo completo de una postulación](#2-flujo-completo-de-una-postulación)
3. [Archivos nuevos y modificados](#3-archivos-nuevos-y-modificados)
4. [Configuración (.env)](#4-configuración-env)
5. [Abstracción del almacenamiento: cambiar de local a S3](#5-abstracción-del-almacenamiento-cambiar-de-local-a-s3)
6. [Validación de archivos: formatos y pesos](#6-validación-de-archivos-formatos-y-pesos)
7. [Validación de los links antes de guardarlos en la BD](#7-validación-de-los-links-antes-de-guardarlos-en-la-bd)
8. [Campos del formulario y cómo agregar más](#8-campos-del-formulario-y-cómo-agregar-más)
9. [Consistencia: archivos huérfanos y reemplazos](#9-consistencia-archivos-huérfanos-y-reemplazos)
10. [Contrato de la API (para el frontend)](#10-contrato-de-la-api-para-el-frontend)
11. [Base de datos y migración](#11-base-de-datos-y-migración)
12. [Seguridad](#12-seguridad)
13. [Pruebas realizadas](#13-pruebas-realizadas)
14. [Pendientes y recomendaciones](#14-pendientes-y-recomendaciones)

---

## 1. Resumen

- `POST api/endpoints/postulaciones.php` ahora recibe **`multipart/form-data`**: campos de texto del formulario más los archivos `cv` (obligatorio) y `constancia_estudios` (opcional).
- El formulario incluye datos nuevos: **carrera (`carrera_id`)**, **edad** y **ciclo universitario**, además del mensaje de presentación.
- Los archivos se guardan mediante una **capa de almacenamiento intercambiable**:
  - `STORAGE_DRIVER=local`: carpeta del computador (por defecto `uploads/` del proyecto, servida por Apache).
  - `STORAGE_DRIVER=s3`: bucket de Amazon S3 (o servicio compatible).
- En la base de datos **siempre se guarda un link** (URL). Antes de insertarlo, el backend comprueba que el link pertenezca al almacenamiento del sistema y que el archivo exista.
- El flujo es: **validar → subir archivo → generar link → insertar link en la BD**. Si algo falla después de subir, el archivo se borra automáticamente.

---

## 2. Flujo completo de una postulación

```
Frontend (FormData)
   │  POST multipart/form-data
   ▼
api/endpoints/postulaciones.php
   │
   │ 1. Upload::readMultipartInput()        -> lee $_POST, detecta si se superó post_max_size
   │ 2. Postulaciones::validarFormulario()  -> carrera, edad, ciclo, mensaje (+ carrera existe en BD)
   │ 3. Upload::validate('cv', ...)         -> error PHP, tamaño, extensión, MIME real, firma binaria
   │    Upload::validate('constancia_estudios', ...)
   │ 4. Postulaciones::validarAlta()        -> estudiante activo, oportunidad vigente, no duplicada
   │
   │    (hasta aquí NO se ha subido nada)
   │
   │ 5. UploadTransaction::store()          -> Storage::driver()->put(...)  ==> devuelve URL
   │ 6. Postulaciones::registrar()          -> validarDocumentos(): la URL es del almacenamiento
   │                                           y el archivo existe -> INSERT/UPDATE en BD
   ▼
Response::success / Response::error (exit)
   │
   ▼
register_shutdown_function -> UploadTransaction::finish()
   - éxito  (code = 1): borra archivos REEMPLAZADOS (CV anterior)
   - fallo  (code ≠ 1): borra archivos NUEVOS (no quedan huérfanos)
```

Todas las validaciones baratas (formulario, archivos y reglas de negocio) se hacen **antes** de subir, para no subir archivos que de todas formas se descartarían.

---

## 3. Archivos nuevos y modificados

### Nuevos

| Archivo | Qué hace |
|---|---|
| `api/core/storage/file-storage.php` | Interfaz `FileStorage` (`put`, `delete`, `owns`, `exists`), clase base `BaseStorage` (conversión llave ↔ URL, validación de llaves) y `StorageException`. |
| `api/core/storage/local-storage.php` | `LocalStorage`: guarda en una carpeta del disco. |
| `api/core/storage/s3-storage.php` | `S3Storage`: guarda en S3 firmando peticiones con AWS Signature V4 vía `curl` (sin SDK ni Composer). |
| `api/core/storage/storage.php` | Fachada `Storage`: lee el `.env`, crea el driver activo (`Storage::driver()`) y valida links (`Storage::isAllowedUrl()`). |
| `api/core/upload.php` | `Upload` (lectura y validación de archivos multipart) y `UploadTransaction` (sube archivos y limpia si algo falla). |
| `uploads/.htaccess` | Protege la carpeta local: solo sirve `.pdf/.jpg/.jpeg/.png`, sin listado de directorio y sin ejecutar PHP. |
| `database/migrations/2026_11_05_postulaciones_formulario_archivos.sql` | Agrega `carrera_id`, `edad`, `ciclo_universitario` a una BD existente (incluye reversa). |
| `docs/SUBIDA_ARCHIVOS.md` | Este documento. |

### Modificados

| Archivo | Cambio |
|---|---|
| `api/endpoints/postulaciones.php` | `POST` pasa de JSON a `multipart/form-data`; crea o edita (`accion=actualizar`) subiendo archivos. `PUT` sin `accion` edita solo datos del formulario. `PUT accion=estado`, `GET` y `DELETE` siguen igual. |
| `api/models/postulaciones.php` | Campos del formulario centralizados en `CAMPOS_FORMULARIO`. `add/update` se dividen en `validarFormulario`, `validarAlta`, `registrar`, `buscarEditable` y `actualizar`. Las URLs se validan contra el almacenamiento. Los `SELECT` devuelven `carrera_id`, `carrera`, `edad` y `ciclo_universitario`. `changeState` y `delete` no cambian. |
| `api/core/response.php` | Nueva propiedad estática `Response::$lastCode`: guarda el último `code` enviado. `UploadTransaction` la usa para saber si la petición terminó bien. |
| `api/core/.env.example` | Variables `STORAGE_*` y `UPLOAD_MAX_MB`. |
| `database/schema.sql` | Columnas nuevas en `postulaciones` y FK `fk_postulaciones_carrera`. |
| `.gitignore` | Ignora `uploads/*` (los archivos de usuarios no se versionan), excepto `uploads/.htaccess`. |

---

## 4. Configuración (.env)

Variables nuevas en `api/core/.env` (ver `api/core/.env.example`):

| Variable | Driver | Por defecto | Descripción |
|---|---|---|---|
| `STORAGE_DRIVER` | todos | `local` | `local` o `s3`. |
| `STORAGE_PUBLIC_URL` | todos | local: `http://localhost/SistemaControlPracticas/uploads` · s3: URL del bucket | **El link base.** Cada archivo queda en `STORAGE_PUBLIC_URL/<llave>` y esa URL completa es la que se guarda en la BD. |
| `STORAGE_LOCAL_PATH` | local | `<proyecto>/uploads` | Carpeta física donde se escriben los archivos. Se crea si no existe. |
| `STORAGE_S3_BUCKET` | s3 | — | Nombre del bucket. |
| `STORAGE_S3_REGION` | s3 | `us-east-1` | Región del bucket. |
| `STORAGE_S3_KEY` | s3 | — | Access Key ID del usuario IAM. |
| `STORAGE_S3_SECRET` | s3 | — | Secret Access Key del usuario IAM. |
| `STORAGE_S3_ENDPOINT` | s3 | vacío (AWS) | Solo para servicios compatibles (MinIO, Cloudflare R2, DigitalOcean Spaces). Si se define, se usa estilo *path* (`endpoint/bucket/llave`). |
| `STORAGE_ALLOWED_URLS` | todos | vacío | Prefijos de almacenamientos **anteriores** cuyas URLs siguen siendo válidas en la BD, separados por coma. |
| `UPLOAD_MAX_MB` | todos | `5` | Peso máximo por archivo en MB. |

Sin ninguna variable `STORAGE_*` en el `.env`, el sistema funciona en modo local con la carpeta `uploads/` del proyecto.

### Configuración local actual (XAMPP)

```env
STORAGE_DRIVER=local
STORAGE_PUBLIC_URL=http://localhost/SistemaControlPracticas/uploads
STORAGE_LOCAL_PATH=C:/xampp/htdocs/SistemaControlPracticas/uploads
UPLOAD_MAX_MB=5
```

`STORAGE_LOCAL_PATH` puede apuntar a otra carpeta del computador (por ejemplo `D:/archivos-practicas`), pero entonces Apache tiene que servir esa carpeta en la URL que diga `STORAGE_PUBLIC_URL` (con un `Alias` en `httpd.conf`) y hay que copiar `uploads/.htaccess` a esa carpeta.

---

## 5. Abstracción del almacenamiento: cambiar de local a S3

### Cómo está armado

```
               ┌──────────────────────────┐
endpoint ─────▶│ Storage::driver()        │  lee STORAGE_DRIVER del .env
modelo   ─────▶│ Storage::isAllowedUrl()  │
               └────────────┬─────────────┘
                            │ devuelve un FileStorage
              ┌─────────────┴──────────────┐
              ▼                            ▼
      LocalStorage                    S3Storage
  (carpeta del disco)        (bucket, firma SigV4 con curl)
```

- El endpoint y el modelo **solo** conocen la interfaz `FileStorage` y la fachada `Storage`. Ninguno crea `LocalStorage` ni `S3Storage` directamente.
- Los dos drivers comparten `BaseStorage`, que convierte una **llave** (`postulaciones/cv/2026/11/<aleatorio>.pdf`) en URL pública (`STORAGE_PUBLIC_URL/<llave>`) y al revés.
- La llave es igual en los dos drivers: en local es la ruta dentro de la carpeta y en S3 es el nombre del objeto. Por eso migrar archivos es copiar la carpeta tal cual al bucket.

### Pasar a S3

1. Crear el bucket y un usuario IAM con permisos `s3:PutObject`, `s3:GetObject` y `s3:DeleteObject` sobre `arn:aws:s3:::<bucket>/*`.
2. Hacer legibles los objetos (política de bucket con `s3:GetObject` público, o una distribución de CloudFront delante del bucket).
3. Cambiar el `.env`:

   ```env
   STORAGE_DRIVER=s3
   STORAGE_PUBLIC_URL=https://mi-bucket.s3.us-east-1.amazonaws.com
   STORAGE_S3_BUCKET=mi-bucket
   STORAGE_S3_REGION=us-east-1
   STORAGE_S3_KEY=AKIA...
   STORAGE_S3_SECRET=...
   ```

   Con CloudFront, `STORAGE_PUBLIC_URL` es el dominio de la distribución (por ejemplo `https://dxxxx.cloudfront.net`).

4. **Postulaciones viejas.** Las filas creadas en local tienen URLs `http://localhost/...`. Hay dos opciones:
   - **Mantenerlas:** agregar el prefijo viejo a `STORAGE_ALLOWED_URLS=http://localhost/SistemaControlPracticas/uploads` para que se puedan seguir editando. El driver S3 no las borra al reemplazarlas, porque no le pertenecen.
   - **Migrarlas:** subir la carpeta con `aws s3 sync uploads/postulaciones s3://mi-bucket/postulaciones` y reescribir las URLs:

     ```sql
     UPDATE postulaciones
        SET cv_url = REPLACE(cv_url, 'http://localhost/SistemaControlPracticas/uploads', 'https://mi-bucket.s3.us-east-1.amazonaws.com'),
            constancia_estudios_url = REPLACE(constancia_estudios_url, 'http://localhost/SistemaControlPracticas/uploads', 'https://mi-bucket.s3.us-east-1.amazonaws.com');
     ```

No hay que cambiar código. Para agregar otro destino (Google Cloud Storage, Azure, etc.), crear una clase que extienda `BaseStorage` e implemente `put`, `delete` y `exists`, y agregar un caso al `match` de `Storage::driver()`.

---

## 6. Validación de archivos: formatos y pesos

`Upload::validate($campo, $etiqueta, $formatos, $requerido)` (en `api/core/upload.php`) aplica estas capas en orden. Con el primer fallo responde `Response::error(...)` y termina la petición.

| # | Capa | Qué evita | Mensaje |
|---|---|---|---|
| 0 | `CONTENT_LENGTH` > `post_max_size` (en `readMultipartInput`) | PHP descarta todo el cuerpo sin avisar | `La solicitud supera el tamaño máximo permitido por el servidor.` (HTTP 413) |
| 1 | Archivo ausente y campo requerido | CV faltante | `El archivo de CV es obligatorio.` |
| 2 | Varios archivos en un campo (`cv[]`) | Arreglos inesperados | `Solo se permite un archivo para CV.` |
| 3 | Código de error de PHP (`UPLOAD_ERR_*`) | Archivos que superan `upload_max_filesize`, subidas parciales, carpeta temporal faltante | `...no debe superar X MB.` / `...se subió incompleto...` / `No se pudo recibir...` |
| 4 | `is_uploaded_file()` | Rutas falsas inyectadas en `tmp_name` | `No se pudo recibir...` |
| 5 | Tamaño real (`filesize`) entre 1 byte y `UPLOAD_MAX_MB` | Archivos vacíos o demasiado pesados | `...está vacío.` / `...no debe superar 5 MB.` |
| 6 | Extensión del nombre original en la lista blanca del campo | `.exe`, `.php`, `.docx`... | `Formato no permitido para CV. Formatos aceptados: pdf.` |
| 7 | MIME detectado por contenido con `finfo` (no se usa el `type` del navegador, que lo controla el cliente) | Un `.txt` renombrado a `.pdf` | `El contenido del archivo de CV no es un pdf válido.` |
| 8 | Firma binaria de los primeros bytes (`%PDF-`, `FF D8 FF`, `89 50 4E 47...`) | Archivos con MIME ambiguo | Igual que la capa 7 |

### Formatos por campo

Se definen en `DOCUMENTOS_POSTULACION`, al inicio de `api/endpoints/postulaciones.php`:

| Campo (`FormData`) | Obligatorio | Formatos | Carpeta (prefijo de llave) |
|---|---|---|---|
| `cv` | Sí al crear, no al editar | `pdf` | `postulaciones/cv/AAAA/MM/` |
| `constancia_estudios` | No | `pdf`, `jpg`, `jpeg`, `png` | `postulaciones/constancias/AAAA/MM/` |

Para cambiar formatos, editar `formatos` usando las constantes `Upload::PDF` y `Upload::IMAGEN`. Para agregar un formato nuevo (por ejemplo `webp`), agregarlo como constante en `Upload` **y** su firma en `Upload::FIRMAS`; sin firma, el archivo se rechaza. También hay que permitir la extensión en `uploads/.htaccess`.

### Peso máximo

- `UPLOAD_MAX_MB` en el `.env` (5 MB por defecto) es el límite que aplica la aplicación a **cada archivo**.
- PHP tiene sus propios límites en `php.ini` (en XAMPP: `upload_max_filesize=40M`, `post_max_size=40M`). Deben ser **mayores** que `UPLOAD_MAX_MB`. `post_max_size` debe alcanzar para todos los archivos juntos más los campos de texto. Si `UPLOAD_MAX_MB` es mayor que `upload_max_filesize`, PHP rechaza el archivo antes (capa 3).

### Nombre del archivo guardado

El nombre original **nunca** se usa. La llave es `<carpeta>/<año>/<mes>/<32 caracteres hexadecimales aleatorios>.<ext>`, generada con `random_bytes(16)`. Así se evitan colisiones, *path traversal* (`../../`), caracteres raros y URLs fáciles de adivinar. `jpeg` se guarda como `jpg`.

---

## 7. Validación de los links antes de guardarlos en la BD

En la BD siempre se guarda una URL (`cv_url`, `constancia_estudios_url`). Antes de cada `INSERT`/`UPDATE`, `Postulaciones::validarDocumentos()` llama a `Storage::isAllowedUrl($url)`, que solo acepta:

1. **URLs del almacenamiento activo:** empiezan con `STORAGE_PUBLIC_URL/`, el resto es una llave válida (solo `[A-Za-z0-9_-]`, segmentos separados por `/` y una extensión, sin `..`) **y el archivo existe de verdad**: `is_file` en local, `HEAD` firmado en S3.
2. **URLs de almacenamientos anteriores** listados en `STORAGE_ALLOWED_URLS`: se valida el prefijo y el formato de la llave, pero no la existencia, porque el driver activo no puede consultar otro almacenamiento.

Se rechaza cualquier otra URL: Google Drive, sitios externos, `javascript:`, rutas inventadas o archivos que no existen. Mensaje: `El enlace del CV no pertenece al almacenamiento del sistema`.

El cliente **ya no puede mandar URLs**. Los links los genera el backend al subir el archivo. La validación del modelo es una segunda barrera: aunque en el futuro otro código llame a `registrar()` o `actualizar()`, no se puede guardar un link ajeno.

---

## 8. Campos del formulario y cómo agregar más

Los campos de datos del formulario se declaran en un solo lugar: `Postulaciones::CAMPOS_FORMULARIO` (`api/models/postulaciones.php`).

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `carrera_id` | entero | Sí | ≥ 1 y debe existir en `carreras` con `estado = 1` |
| `edad` | entero | Sí | 15 – 99 |
| `ciclo_universitario` | entero | Sí | 1 – 20 |
| `mensaje_presentacion` | texto | No | máx. 3000 caracteres |

La llave de cada entrada es, a la vez, el nombre del campo en el `FormData`/JSON y el nombre de la columna en `postulaciones`. A partir de esta lista se generan solos la validación, las columnas del `INSERT`, el `SET` del `UPDATE` y el `SELECT` de `buscarEditable()`.

### Agregar un dato nuevo (ejemplo: `telefono_contacto`)

1. Crear una migración en `database/migrations/` (y reflejarla en `schema.sql`):

   ```sql
   ALTER TABLE postulaciones ADD COLUMN telefono_contacto VARCHAR(30) NULL AFTER ciclo_universitario;
   ```

2. Agregar una línea a `CAMPOS_FORMULARIO`:

   ```php
   'telefono_contacto' => ['tipo' => 'texto', 'requerido' => false, 'max' => 30, 'etiqueta' => 'teléfono de contacto'],
   ```

3. Para devolverlo en los listados, agregar `p.telefono_contacto` a `SELECT_BASE`.
4. En el frontend, agregar `formData.append('telefono_contacto', ...)`.

Los tipos soportados son `entero` (con `min`/`max` de rango) y `texto` (con `max` de caracteres). Para otro tipo (fecha, enum, etc.), agregar un caso en `validarFormulario()`.

En **edición**, los campos que no se envían conservan su valor actual. Por eso el frontend puede mandar solo lo que cambió.

---

## 9. Consistencia: archivos huérfanos y reemplazos

`Response::success()` y `Response::error()` terminan el script con `exit`, así que no hay un "después" normal donde limpiar. `UploadTransaction` registra un `register_shutdown_function` que corre al final de **toda** petición en la que se creó, y revisa `Response::$lastCode`:

| Resultado | Qué se borra |
|---|---|
| `code = 1` (éxito) | Los archivos **reemplazados**: el CV o la constancia anterior al editar, los archivos de una postulación retirada que se reactiva, o la constancia quitada con `quitar_constancia=1`. |
| Cualquier otro resultado (validación, duplicado, error de BD, excepción, falla de S3) | Los archivos **nuevos** subidos en esta petición. |

Así, un archivo subido sin fila en la BD se elimina, y un archivo viejo solo se elimina cuando el nuevo ya quedó guardado.

- `replaceOnSuccess()` solo marca URLs que pertenecen al driver activo (`owns`). Las URLs de almacenamientos anteriores nunca se borran automáticamente.
- El borrado lógico (`DELETE`, `estado = 0`) **no** borra archivos: si el estudiante se vuelve a postular, la postulación se reactiva y entonces sí se reemplazan.
- Si borrar falla en la limpieza, el error se ignora en silencio porque la respuesta ya se envió. Puede quedar un archivo huérfano, pero nunca una fila con un link roto.

---

## 10. Contrato de la API (para el frontend)

Endpoint: `/SistemaControlPracticas/api/endpoints/postulaciones.php`

### 10.1 Crear postulación: `POST` (multipart/form-data)

| Campo | Tipo | Obligatorio |
|---|---|---|
| `oportunidad_id` | texto (entero) | Sí |
| `estudiante_id` | texto (entero) | Sí |
| `carrera_id` | texto (entero) | Sí |
| `edad` | texto (entero) | Sí |
| `ciclo_universitario` | texto (entero) | Sí |
| `mensaje_presentacion` | texto | No |
| `cv` | archivo PDF | Sí |
| `constancia_estudios` | archivo PDF/JPG/PNG | No |

```js
const fd = new FormData();
fd.append("oportunidad_id", oportunidad.id);
fd.append("estudiante_id", usuario.id);
fd.append("carrera_id", form.carrera_id);
fd.append("edad", form.edad);
fd.append("ciclo_universitario", form.ciclo_universitario);
fd.append("mensaje_presentacion", form.mensaje_presentacion);
fd.append("cv", archivoCv);                       // File de <input type="file" accept="application/pdf">
if (archivoConstancia) fd.append("constancia_estudios", archivoConstancia);

await fetch("/SistemaControlPracticas/api/endpoints/postulaciones.php", {
  method: "POST",
  body: fd,               // NO poner Content-Type: el navegador agrega el boundary
  credentials: "include",
});
```

> **Importante:** `apiFetch` (`frontend/src/api/generic-api.js`) hoy convierte cualquier `FormData` a JSON con `Object.fromEntries` y fuerza `Content-Type: application/json`, así que **los archivos se pierden**. Para usarlo con archivos, cuando `body instanceof FormData` debe mandar el `FormData` tal cual y no fijar `Content-Type`. Si no, use `fetch` directamente como en el ejemplo. Un `POST` en JSON responde `Petición inválida: la postulación se envía como multipart/form-data.`

Respuesta OK: `{"code":1,"message":"Operación exitosa","data":"Postulación registrada con éxito"}`

### 10.2 Editar postulación con archivos: `POST` (multipart) con `accion=actualizar`

Solo funciona mientras la postulación está `pendiente`. PHP no procesa `multipart` en `PUT`, por eso la edición con archivos usa `POST`.

| Campo | Obligatorio | Nota |
|---|---|---|
| `accion` | Sí | `actualizar` |
| `id` | Sí | id de la postulación |
| `carrera_id`, `edad`, `ciclo_universitario`, `mensaje_presentacion` | No | Si no se envían, conservan su valor |
| `cv` | No | Si se envía, reemplaza el CV anterior (el viejo se borra) |
| `constancia_estudios` | No | Si se envía, reemplaza la anterior |
| `quitar_constancia` | No | `1` para eliminar la constancia actual |

### 10.3 Editar solo datos: `PUT` (JSON)

```json
{ "id": 12, "edad": 22, "ciclo_universitario": 6, "mensaje_presentacion": "..." }
```

No toca archivos. Los campos ausentes conservan su valor. Los antiguos `cv_url`/`constancia_estudios_url` en el JSON **se ignoran**.

### 10.4 Sin cambios

- `PUT` con `accion=estado` (el reclutador cambia el estado) funciona igual que antes.
- `GET` (por `id`, `estudiante_id`, `oportunidad_id` o todas) funciona igual que antes y ahora también devuelve `carrera_id`, `carrera` (nombre), `edad` y `ciclo_universitario`. `cv_url` y `constancia_estudios_url` son links directos para abrir o descargar el archivo.
- `DELETE ?id=` funciona igual que antes.

### Mensajes de error que puede mostrar el frontend

Todos llegan como `{"code": -1, "message": "..."}`:

- `El campo edad es obligatorio` / `El campo edad debe ser un número entero entre 15 y 99`
- `La carrera seleccionada no existe`
- `El archivo de CV es obligatorio.`
- `Formato no permitido para CV. Formatos aceptados: pdf.`
- `El contenido del archivo de CV no es un pdf válido.`
- `El archivo de CV no debe superar 5 MB.`
- `El estudiante ya se postuló a esta oportunidad`
- `La postulación ya está en proceso y no se puede editar`
- `No se pudo guardar el archivo. Inténtelo de nuevo.` (falla de disco/S3 o `.env` mal configurado)

---

## 11. Base de datos y migración

Columnas nuevas en `postulaciones`:

| Columna | Tipo | Nota |
|---|---|---|
| `carrera_id` | `INT NULL` + FK a `carreras(id)` (`ON DELETE SET NULL`) | Carrera que declara el estudiante en el formulario |
| `edad` | `TINYINT UNSIGNED NULL` | |
| `ciclo_universitario` | `TINYINT UNSIGNED NULL` | |

Las columnas son `NULL` en la tabla para no romper postulaciones anteriores. La obligatoriedad la aplica el backend en las postulaciones nuevas y en las ediciones.

- **Instalación nueva:** `database/schema.sql` ya incluye las columnas.
- **BD existente:** ejecutar `database/migrations/2026_11_05_postulaciones_formulario_archivos.sql`. La reversa está comentada al final del archivo.

> La migración **ya se aplicó** en la BD local `control_practicas_db` (puerto 3308) durante las pruebas.

---

## 12. Seguridad

- **Archivos:** lista blanca de extensiones, MIME por contenido y firma binaria. El nombre se genera aleatoriamente, así que el nombre del usuario nunca llega al disco.
- **Carpeta local (`uploads/.htaccess`):** deniega todo excepto `.pdf/.jpg/.jpeg/.png`, desactiva el listado de directorio, apaga el motor PHP (`php_flag engine off`, `RemoveHandler`) y envía `X-Content-Type-Options: nosniff`. Se probó que un `.php` copiado a mano a `uploads/` responde **403**.
- **Llaves:** `BaseStorage::isSafeKey()` exige el patrón `segmento/segmento.ext`. `LocalStorage` además verifica con `realpath` que el archivo resuelto quede dentro de la carpeta raíz antes de leerlo o borrarlo.
- **Links en BD:** solo URLs del almacenamiento del sistema (sección 7).
- **S3:** credenciales solo en el `.env` (que ya está en `.gitignore`). El usuario IAM debe tener el mínimo de permisos (Put/Get/Delete sobre el bucket).
- **Archivos de usuarios fuera de git:** `uploads/*` está en `.gitignore`.

---

## 13. Pruebas realizadas

Se hicieron contra Apache/XAMPP local con `curl`:

| Caso | Resultado |
|---|---|
| `POST` en JSON | Rechazado: se espera multipart |
| Sin archivo `cv` | `El archivo de CV es obligatorio.` |
| `edad=200` | `...debe ser un número entero entre 15 y 99` |
| `.pdf` que en realidad es texto | `El contenido del archivo de CV no es un pdf válido.` |
| PDF de 6 MB | `El archivo de CV no debe superar 5 MB.` |
| Constancia con nombre `.exe` | `Formato no permitido...` |
| Estudiante inexistente | Rechazado **antes** de subir; `uploads/` quedó vacío |
| Postulación válida con CV y constancia | Fila creada con `carrera_id`, `edad`, `ciclo` y dos URLs locales; archivos en `uploads/postulaciones/...` |
| Abrir el `cv_url` guardado | HTTP 200, `application/pdf` |
| Postulación duplicada | Rechazada y el archivo nuevo se **borró** |
| Editar con CV nuevo + `quitar_constancia=1` | CV viejo y constancia borrados del disco, BD actualizada |
| `PUT` JSON cambiando solo el ciclo | OK, archivos sin cambios |
| `PUT` con `carrera_id=999` | `La carrera seleccionada no existe` |
| `.php` dentro de `uploads/` | HTTP 403 |
| Fila con `cv_url` de Google Drive al editar | `El enlace del CV no pertenece al almacenamiento del sistema` |
| Subir constancia y fallar después al validar el CV | La constancia recién subida se **borró** (rollback) |

Los datos y archivos de prueba se eliminaron al terminar.

**No probado:** el driver `S3Storage` contra un bucket real, porque no había credenciales disponibles. La firma sigue la especificación AWS Signature V4. Antes de usarlo en producción, hacer una prueba de subida, `HEAD` y borrado con un bucket de prueba.

---

## 14. Pendientes y recomendaciones

1. **Autenticación en `postulaciones.php`.** El endpoint **no** llama a `requireAuth()` (así estaba antes de estos cambios y no se modificó). Hoy cualquiera puede subir archivos y el `estudiante_id` viene del cliente. Se recomienda:
   - `requireAuth()` en `POST/PUT/DELETE` (esto también valida el token CSRF; el frontend debe mandar `X-CSRF-Token` en el `fetch` con `FormData`).
   - Tomar `estudiante_id` de la sesión (`$auth_data['id']`) en lugar del formulario, y verificar en `accion=actualizar`/`PUT`/`DELETE` que la postulación sea del usuario.
2. **Privacidad en S3.** Un CV contiene datos personales. Con un bucket público, cualquiera que tenga el link (difícil de adivinar, pero compartible) puede abrirlo. Una alternativa más privada es un bucket privado con URLs prefirmadas de corta duración, generadas en el `GET`. Para eso se agregaría un método `temporaryUrl()` en `FileStorage`; el resto del diseño no cambia.
3. **Archivos huérfanos residuales.** Si falla un borrado durante la limpieza, puede quedar un archivo sin fila. Un script periódico puede comparar el contenido de `uploads/` (o del bucket) con las URLs de la BD.
4. **Frontend:** ajustar `apiFetch` para `FormData` (sección 10.1) y cambiar `PostularseForm.jsx` de inputs de URL a `<input type="file">` más los campos `carrera_id`, `edad` y `ciclo_universitario`.
