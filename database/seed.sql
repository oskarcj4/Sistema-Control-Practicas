-- =============================================================================
-- SEED: datos iniciales para control_practicas_db
-- Correr DESPUÉS de database/schema.sql (base recién creada).
-- Orden: roles -> instituciones -> carreras -> usuarios -> asignaciones_roles
-- =============================================================================

USE control_practicas_db;

-- 1. ROLES (los ids están fijos en el código: 1, 2 y 3)
INSERT INTO roles (id, nombre, descripcion) VALUES
(1, 'estudiante',    'Estudiante que busca prácticas y se postula'),
(2, 'administrador', 'Administrador general del sistema'),
(3, 'reclutador',    'Publica oportunidades y revisa postulaciones');

-- 2. INSTITUCIONES
INSERT INTO instituciones (id, nombre, siglas, tipo, contacto_email, sitio_web) VALUES
(1, 'Universidad Mariano Gálvez de Guatemala', 'UMG',  'universidad', 'info@umg.edu.gt',         'https://umg.edu.gt'),
(2, 'Universidad de San Carlos de Guatemala',  'USAC', 'universidad', 'informacion@usac.edu.gt', 'https://usac.edu.gt'),
(3, 'Instituto Nacional Central para Varones', 'IN3',  'otra',        'contacto@in3.edu.gt',     'https://in3.edu.gt');

-- 3. CARRERAS
INSERT INTO carreras (id, institucion_id, nombre, codigo) VALUES
-- UMG (institucion_id = 1)
(1,  1, 'Ingeniería en Sistemas de Información y Ciencias de la Computación', 'UMG-ISICC'),
(2,  1, 'Ingeniería Industrial', 'UMG-IND'),
(3,  1, 'Ingeniería Civil', 'UMG-CIV'),
(4,  1, 'Licenciatura en Ciencias Jurídicas y Sociales', 'UMG-DER'),
(5,  1, 'Licenciatura en Administración de Empresas', 'UMG-ADM'),
-- USAC (institucion_id = 2)
(6,  2, 'Ingeniería en Ciencias y Sistemas', 'USAC-ICS'),
(7,  2, 'Ingeniería Mecánica Eléctrica', 'USAC-IME'),
(8,  2, 'Ingeniería Química', 'USAC-IQ'),
(9,  2, 'Médico y Cirujano', 'USAC-MED'),
(10, 2, 'Licenciatura en Auditoría y Contaduría Pública', 'USAC-CPA'),
-- IN3 (institucion_id = 3)
(11, 3, 'Bachillerato en Ciencias y Letras con Orientación en Computación', 'IN3-BCLC'),
(12, 3, 'Perito en Electricidad Industrial', 'IN3-PEI'),
(13, 3, 'Perito en Electrónica Digital', 'IN3-PED'),
(14, 3, 'Perito en Mecánica Automotriz', 'IN3-PMA'),
(15, 3, 'Bachillerato Industrial y Perito en Dibujo Técnico de Ingeniería', 'IN3-BIPD');

-- 4. USUARIOS DE PRUEBA
-- Contraseña de los tres: Password123  (cambiarla fuera de desarrollo)
INSERT INTO usuarios (id, username, nombre, apellido, email, password_hash, institucion_id, carrera_id, carnet, autorizado_publicar) VALUES
(1, 'admin',      'Admin',      'Sistema',    'admin@practicas.local',      '$2y$10$/7mpFDXF/YGck.IyfroRU.61wuq/Vy.hWa0joApBMM5UWpoplUT3K', NULL, NULL, NULL,          1),
(2, 'reclutador', 'Reclutador', 'Prueba',     'reclutador@practicas.local', '$2y$10$/7mpFDXF/YGck.IyfroRU.61wuq/Vy.hWa0joApBMM5UWpoplUT3K', 1,    NULL, NULL,          1),
(3, 'estudiante', 'Estudiante', 'Prueba',     'estudiante@practicas.local', '$2y$10$/7mpFDXF/YGck.IyfroRU.61wuq/Vy.hWa0joApBMM5UWpoplUT3K', 1,    1,    '0900-20-0001', 0);

-- 5. ROLES DE CADA USUARIO
INSERT INTO asignaciones_roles (id_usuario, id_rol) VALUES
(1, 2),  -- admin      -> administrador
(2, 3),  -- reclutador -> reclutador
(3, 1);  -- estudiante -> estudiante
