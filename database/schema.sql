-- =============================================================================
-- ESQUEMA: FEED DE OPORTUNIDADES Y SEGUIMIENTO DE POSTULACIONES
-- Motor: MySQL 8.0+ / MariaDB 10.4+
-- Juego de caracteres: utf8mb4 | Colación: utf8mb4_unicode_ci
--
-- ATENCIÓN: borra la base control_practicas_db completa y la crea de cero.
-- Después de este archivo, correr database/seed.sql.
--
-- Roles: los roles de un usuario viven SOLO en asignaciones_roles.
--        La tabla usuarios NO tiene rol_id.
-- =============================================================================

DROP DATABASE IF EXISTS control_practicas_db;

CREATE DATABASE control_practicas_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE control_practicas_db;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE COMMENT 'estudiante, administrador, reclutador',
    descripcion VARCHAR(255) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE instituciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    siglas VARCHAR(20) NULL,
    tipo ENUM('universidad', 'empresa', 'startup_estudiantil', 'otra') NOT NULL DEFAULT 'empresa',
    contacto_email VARCHAR(150) NULL,
    sitio_web VARCHAR(255) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carreras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institucion_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(30) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_carreras_institucion (institucion_id),
    CONSTRAINT fk_carreras_institucion FOREIGN KEY (institucion_id)
        REFERENCES instituciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uk_inst_carrera UNIQUE (institucion_id, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    institucion_id INT NULL COMMENT 'FK a la institución/empresa registrada',
    carrera_id INT NULL COMMENT 'Aplica para estudiantes',
    carnet VARCHAR(30) NULL COMMENT 'Aplica para estudiantes',
    telefono VARCHAR(30) NULL,
    biografia TEXT NULL,
    autorizado_publicar TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: No autorizado a publicar ofertas, 1: Autorizado por admin',
    estado_cuenta ENUM('activo', 'inactivo', 'suspendido') NOT NULL DEFAULT 'activo' COMMENT 'Estado de negocio de la cuenta',
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_institucion FOREIGN KEY (institucion_id)
        REFERENCES instituciones(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_usuarios_carrera FOREIGN KEY (carrera_id)
        REFERENCES carreras(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_usuarios_autorizado (autorizado_publicar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles de cada usuario (un usuario puede tener varios)
CREATE TABLE asignaciones_roles (
    id_usuario INT NOT NULL,
    id_rol INT NOT NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    PRIMARY KEY (id_usuario, id_rol),
    INDEX idx_asignaciones_rol (id_rol),
    CONSTRAINT fk_asignaciones_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_asignaciones_rol FOREIGN KEY (id_rol)
        REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE solicitudes_publicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombre_organizacion_proyecto VARCHAR(150) NOT NULL COMMENT 'Ej: Startup campus, Empresa X',
    descripcion_actividades TEXT NOT NULL COMMENT 'Por qué requiere practicantes y qué tareas harán',
    documento_respaldo_url VARCHAR(255) NULL COMMENT 'PDF de constitución, carta firmada o carnet',
    estado_solicitud ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    comentario_admin TEXT NULL COMMENT 'Motivo de rechazo o instrucciones',
    revisado_por INT NULL COMMENT 'ID del administrador que revisó',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_revision DATETIME NULL,
    CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_solicitudes_admin FOREIGN KEY (revisado_por)
        REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_solicitudes_estado (estado_solicitud, fecha_solicitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE oportunidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    requisitos TEXT NULL,
    institucion_id INT NULL COMMENT 'Institución o Startup asociada',
    carrera_id INT NULL COMMENT 'Carrera objetivo para filtrar',
    modalidad ENUM('presencial', 'remoto', 'hibrido') NOT NULL DEFAULT 'presencial',
    ubicacion VARCHAR(150) NULL,
    fecha_publicacion DATE NOT NULL,
    fecha_cierre DATE NOT NULL,
    estado_oportunidad ENUM('activa', 'cerrada', 'cancelada') NOT NULL DEFAULT 'activa',
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    creado_por INT NOT NULL COMMENT 'Usuario autorizado',
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    visto BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_oportunidades_institucion FOREIGN KEY (institucion_id)
        REFERENCES instituciones(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_oportunidades_carrera FOREIGN KEY (carrera_id)
        REFERENCES carreras(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_oportunidades_creador FOREIGN KEY (creado_por)
        REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Feed con paginación por cursor: WHERE estado, estado_oportunidad ... ORDER BY id DESC
    INDEX idx_feed_oportunidades (estado, estado_oportunidad, id),
    INDEX idx_oportunidades_creador (creado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE postulaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    oportunidad_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    fecha_postulacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_postulacion ENUM('pendiente', 'en_revision', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente',
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    cv_url VARCHAR(255) NOT NULL COMMENT 'URL del PDF de hoja de vida en el almacenamiento del sistema (local o S3)',
    constancia_estudios_url VARCHAR(255) NULL COMMENT 'URL opcional (PDF/JPG/PNG) de constancia en el almacenamiento del sistema',
    mensaje_presentacion TEXT NULL,
    carrera_id INT NULL COMMENT 'Carrera que declara el estudiante al postularse',
    edad TINYINT UNSIGNED NULL COMMENT 'Edad declarada al postularse',
    ciclo_universitario TINYINT UNSIGNED NULL COMMENT 'Ciclo/semestre que cursa al postularse',
    CONSTRAINT fk_postulaciones_oportunidad FOREIGN KEY (oportunidad_id)
        REFERENCES oportunidades(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_postulaciones_estudiante FOREIGN KEY (estudiante_id)
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_postulaciones_carrera FOREIGN KEY (carrera_id)
        REFERENCES carreras(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uk_oportunidad_estudiante UNIQUE (oportunidad_id, estudiante_id),
    INDEX idx_postulaciones_estudiante (estudiante_id),
    INDEX idx_postulaciones_estado (estado_postulacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historial_estado_postulacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    postulacion_id INT NOT NULL,
    estado_anterior VARCHAR(30) NOT NULL,
    estado_nuevo VARCHAR(30) NOT NULL,
    comentario TEXT NULL,
    actualizado_por INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    CONSTRAINT fk_historial_postulacion FOREIGN KEY (postulacion_id)
        REFERENCES postulaciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (actualizado_por)
        REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_historial_postulacion (postulacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    enlace VARCHAR(255) NULL COMMENT 'Ruta del frontend (#/...) que abre la notificación',
    leido TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: activo, 0: inactivo (soft delete)',
    CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notificaciones_usuario (usuario_id, leido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bitácora que llena api/core/audit-log.php en cada INSERT/UPDATE/DELETE
CREATE TABLE bitacora (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `user` VARCHAR(100) NOT NULL,
    action VARCHAR(10) NOT NULL,
    newDate JSON NULL,
    nameTable VARCHAR(64) NOT NULL,
    idRowTable VARCHAR(64) NOT NULL,
    dateEvent DATETIME NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_bitacora_tabla (nameTable, idRowTable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
