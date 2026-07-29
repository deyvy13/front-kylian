-- ============================================================
--  ACTUALIZACIÓN — Hardening de seguridad
--
--  - Rate limit del login (bloqueo temporal tras N intentos)
--  - Password mínimo 8 caracteres al crear/actualizar
--  - Mensaje genérico "Credenciales inválidas" (sin filtrar si
--    el correo existe o no) para el login
--
--  Ejecutar UNA VEZ en el SQL Editor de Supabase. Idempotente.
-- ============================================================
SET TIME ZONE 'America/Lima';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- 1. Registro de intentos fallidos ----
CREATE TABLE IF NOT EXISTS auth_login_intentos (
    correo           VARCHAR(150) PRIMARY KEY,
    intentos         INT NOT NULL DEFAULT 0,
    bloqueado_hasta  TIMESTAMP,
    ultimo_intento   TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE auth_login_intentos DISABLE ROW LEVEL SECURITY;

-- ---- 2. auth_login con rate limit ----
CREATE OR REPLACE FUNCTION auth_login(p_correo VARCHAR, p_password TEXT)
RETURNS TABLE (id INT, nombre VARCHAR, correo VARCHAR)
LANGUAGE plpgsql SECURITY DEFINER SET timezone = 'America/Lima' AS $$
DECLARE
    v_correo    TEXT := LOWER(TRIM(p_correo));
    v_ahora     TIMESTAMP := NOW();
    v_intentos  RECORD;
    v_user_id   INT;
    v_nombre    VARCHAR;
    v_correo_r  VARCHAR;
    c_max_int   INT := 11;  -- intentos permitidos antes de bloqueo
    c_bloqueo   INT := 10;  -- minutos de bloqueo
BEGIN
    SELECT * INTO v_intentos FROM auth_login_intentos WHERE correo = v_correo;
    IF v_intentos.bloqueado_hasta IS NOT NULL AND v_intentos.bloqueado_hasta > v_ahora THEN
        RAISE EXCEPTION 'Demasiados intentos. Intenta nuevamente en % minuto(s).',
            CEIL(EXTRACT(EPOCH FROM (v_intentos.bloqueado_hasta - v_ahora)) / 60)::INT;
    END IF;

    SELECT u.id, u.nombre, u.correo INTO v_user_id, v_nombre, v_correo_r
    FROM auth_usuarios u
    WHERE u.correo = v_correo
      AND u.estado = 1
      AND u.password_hash IS NOT NULL
      AND u.password_hash = crypt(p_password, u.password_hash);

    IF v_user_id IS NOT NULL THEN
        DELETE FROM auth_login_intentos WHERE correo = v_correo;
        RETURN QUERY SELECT v_user_id, v_nombre, v_correo_r;
    ELSE
        INSERT INTO auth_login_intentos (correo, intentos, ultimo_intento)
        VALUES (v_correo, 1, v_ahora)
        ON CONFLICT (correo) DO UPDATE
            SET intentos       = auth_login_intentos.intentos + 1,
                ultimo_intento = v_ahora,
                bloqueado_hasta = CASE
                    WHEN auth_login_intentos.intentos + 1 >= c_max_int
                    THEN v_ahora + (c_bloqueo || ' minutes')::INTERVAL
                    ELSE NULL END;
        -- Devuelve set vacío → cliente muestra "credenciales inválidas"
    END IF;
END; $$;
GRANT EXECUTE ON FUNCTION auth_login(VARCHAR, TEXT) TO anon, authenticated;

-- ---- 3. Password mínimo 8 caracteres al crear/actualizar usuario ----
CREATE OR REPLACE FUNCTION auth_usuarios_crear(
    p_nombre VARCHAR, p_correo VARCHAR, p_password TEXT, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = LOWER(p_correo) AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado.'; END IF;
    IF p_password IS NULL OR LENGTH(p_password) < 8 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres.'; END IF;
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
    IF p_password IS NOT NULL AND LENGTH(p_password) > 0 AND LENGTH(p_password) < 8 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 8 caracteres.'; END IF;
    UPDATE auth_usuarios
    SET nombre = p_nombre, correo = LOWER(p_correo),
        password_hash = CASE
            WHEN p_password IS NOT NULL AND LENGTH(p_password) > 0
                THEN crypt(p_password, gen_salt('bf'))
            ELSE password_hash END,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

NOTIFY pgrst, 'reload schema';
