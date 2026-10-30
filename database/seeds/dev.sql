-- =============================================================================
-- SATET - Datos iniciales de desarrollo
-- Cuentas institucionales A/B/C (módulo 05) y usuario administrador.
-- Los números de cuenta son ficticios: no corresponden a cuentas reales.
-- Docker lo aplica después de schema.sql al crear el volumen por primera vez.
-- Idempotente: se puede volver a ejecutar sin duplicar filas.
-- =============================================================================

-- Administrador local. Contraseña de desarrollo: SatetAdmin12
-- Hash bcrypt costo 12 (módulo 01, regla 3). No tiene fila en taxpayers.
INSERT INTO users (id, email, password_hash, role, is_active)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'admin@satet.local',
    '$2b$12$kwQCpcmOZ.8u2QYKswlGOuEvZDGSWJDow.DXsTXPlDffG.iJvt6S6',
    'ADMIN_SISTEMA',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Las cuentas institucionales (Banco de Venezuela, Banca Amiga y BNC) se cargan en schema.sql.
