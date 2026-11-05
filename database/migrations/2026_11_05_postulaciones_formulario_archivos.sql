-- =============================================================================
-- MIGRACIÓN: formulario de postulación con archivos
-- Fecha: 2026-11-05
--
-- Para bases ya creadas con una versión anterior de database/schema.sql.
-- (schema.sql ya incluye estas columnas para instalaciones nuevas.)
--
--   - carrera_id, edad y ciclo_universitario: datos nuevos del formulario.
--     Son NULL en la tabla para no romper postulaciones existentes; el backend
--     los exige en postulaciones nuevas (Postulaciones::CAMPOS_FORMULARIO).
--   - cv_url / constancia_estudios_url: misma columna, ahora guardan la URL del
--     archivo en el almacenamiento del sistema (carpeta local o S3).
--
-- Reversa al final del archivo (comentada).
-- =============================================================================

USE control_practicas_db;

ALTER TABLE postulaciones
    ADD COLUMN carrera_id INT NULL COMMENT 'Carrera que declara el estudiante al postularse' AFTER mensaje_presentacion,
    ADD COLUMN edad TINYINT UNSIGNED NULL COMMENT 'Edad declarada al postularse' AFTER carrera_id,
    ADD COLUMN ciclo_universitario TINYINT UNSIGNED NULL COMMENT 'Ciclo/semestre que cursa al postularse' AFTER edad,
    ADD CONSTRAINT fk_postulaciones_carrera FOREIGN KEY (carrera_id)
        REFERENCES carreras(id) ON DELETE SET NULL ON UPDATE CASCADE,
    MODIFY cv_url VARCHAR(255) NOT NULL COMMENT 'URL del PDF de hoja de vida en el almacenamiento del sistema (local o S3)',
    MODIFY constancia_estudios_url VARCHAR(255) NULL COMMENT 'URL opcional (PDF/JPG/PNG) de constancia en el almacenamiento del sistema';

-- -----------------------------------------------------------------------------
-- REVERSA
-- -----------------------------------------------------------------------------
-- ALTER TABLE postulaciones
--     DROP FOREIGN KEY fk_postulaciones_carrera,
--     DROP COLUMN ciclo_universitario,
--     DROP COLUMN edad,
--     DROP COLUMN carrera_id;
