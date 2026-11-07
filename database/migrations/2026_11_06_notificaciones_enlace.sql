-- =============================================================================
-- MIGRACIÓN: enlace en notificaciones
-- Fecha: 2026-11-06
--
-- Para bases ya creadas con una versión anterior de database/schema.sql.
-- (schema.sql ya incluye esta columna para instalaciones nuevas.)
--
--   - enlace: ruta del frontend que abre la notificación al hacer clic,
--     por ejemplo "#/oferta/15" o "#/admin/solicitudes". NULL = sin enlace.
--
-- Reversa al final del archivo (comentada).
-- =============================================================================

USE control_practicas_db;

ALTER TABLE notificaciones
    ADD COLUMN enlace VARCHAR(255) NULL COMMENT 'Ruta del frontend (#/...) que abre la notificación' AFTER mensaje;

-- -----------------------------------------------------------------------------
-- REVERSA
-- -----------------------------------------------------------------------------
-- ALTER TABLE notificaciones DROP COLUMN enlace;
