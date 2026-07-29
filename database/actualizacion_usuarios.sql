-- ============================================================
--  ACTUALIZACIÓN — Funciones RPC del módulo Usuarios
--  Ejecuta esto si al abrir /usuarios ves 404 en el RPC
--  auth_usuarios_listar. Es idempotente (usa OR REPLACE).
-- ============================================================
SET TIME ZONE 'America/Lima';
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE auth_usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE OR REPLACE FUNCTION auth_usuarios_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (id INT, nombre VARCHAR, correo VARCHAR, fecha_creacion TIMESTAMP)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.nombre, u.correo, u.fecha_creacion
    FROM auth_usuarios u
    WHERE u.estado = 1
      AND (p_texto IS NULL OR u.nombre ILIKE '%'||p_texto||'%' OR u.correo ILIKE '%'||p_texto||'%')
    ORDER BY u.fecha_creacion DESC, u.id DESC;
END; $$;

CREATE OR REPLACE FUNCTION auth_usuarios_crear(
    p_nombre VARCHAR, p_correo VARCHAR, p_password TEXT, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = LOWER(p_correo) AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado.'; END IF;
    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.'; END IF;
    INSERT INTO auth_usuarios (nombre, correo, password_hash,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombre, LOWER(p_correo), crypt(p_password, gen_salt('bf')),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION auth_usuarios_actualizar(
    p_id INT, p_nombre VARCHAR, p_correo VARCHAR, p_password TEXT, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = LOWER(p_correo) AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado en otro usuario.'; END IF;
    IF p_password IS NOT NULL AND LENGTH(p_password) > 0 AND LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.'; END IF;
    UPDATE auth_usuarios
    SET nombre = p_nombre, correo = LOWER(p_correo),
        password_hash = CASE
            WHEN p_password IS NOT NULL AND LENGTH(p_password) > 0
                THEN crypt(p_password, gen_salt('bf'))
            ELSE password_hash END,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

CREATE OR REPLACE FUNCTION auth_usuarios_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF p_id = 1 THEN
        RAISE EXCEPTION 'El usuario administrador no puede eliminarse.'; END IF;
    UPDATE auth_usuarios SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

-- Refrescar cache de PostgREST (por si estaba viejo)
NOTIFY pgrst, 'reload schema';
