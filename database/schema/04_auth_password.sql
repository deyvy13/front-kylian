-- Actualización: agrega password_hash a auth_usuarios + extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE auth_usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
