-- ============================================================
--  PATCH — Cambia el límite de intentos de login de 5 a 11.
--  Solo es necesario si ya corriste antes actualizacion_seguridad.sql.
--  Ejecutar UNA VEZ en el SQL Editor.
-- ============================================================
SET TIME ZONE 'America/Lima';

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
    END IF;
END; $$;
GRANT EXECUTE ON FUNCTION auth_login(VARCHAR, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
