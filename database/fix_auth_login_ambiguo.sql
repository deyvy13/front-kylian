-- ============================================================
--  FIX crítico — auth_login ambigüedad de columna "correo"
--
--  Bug: la cláusula RETURNS TABLE (id, nombre, correo) declara
--  variables OUT con esos nombres. Dentro del cuerpo, escribir
--  "WHERE correo = v_correo" hace que Postgres no sepa si
--  "correo" es la columna o la variable OUT.
--
--  Fix: calificar todas las referencias con el nombre de la
--  tabla (auth_login_intentos.correo).
--
--  Ejecutar UNA VEZ en el SQL Editor de Supabase.
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
    c_max_int   INT := 11;
    c_bloqueo   INT := 10;
BEGIN
    -- Bloqueo activo?
    SELECT * INTO v_intentos
    FROM auth_login_intentos
    WHERE auth_login_intentos.correo = v_correo;

    IF v_intentos.bloqueado_hasta IS NOT NULL AND v_intentos.bloqueado_hasta > v_ahora THEN
        RAISE EXCEPTION 'Demasiados intentos. Intenta nuevamente en % minuto(s).',
            CEIL(EXTRACT(EPOCH FROM (v_intentos.bloqueado_hasta - v_ahora)) / 60)::INT;
    END IF;

    -- Verificar credenciales
    SELECT u.id, u.nombre, u.correo
      INTO v_user_id, v_nombre, v_correo_r
    FROM auth_usuarios u
    WHERE u.correo = v_correo
      AND u.estado = 1
      AND u.password_hash IS NOT NULL
      AND u.password_hash = crypt(p_password, u.password_hash);

    IF v_user_id IS NOT NULL THEN
        DELETE FROM auth_login_intentos
        WHERE auth_login_intentos.correo = v_correo;
        RETURN QUERY SELECT v_user_id, v_nombre, v_correo_r;
    ELSE
        INSERT INTO auth_login_intentos AS li (correo, intentos, ultimo_intento)
        VALUES (v_correo, 1, v_ahora)
        ON CONFLICT (correo) DO UPDATE
            SET intentos       = li.intentos + 1,
                ultimo_intento = v_ahora,
                bloqueado_hasta = CASE
                    WHEN li.intentos + 1 >= c_max_int
                    THEN v_ahora + (c_bloqueo || ' minutes')::INTERVAL
                    ELSE NULL END;
        -- Devuelve set vacío → cliente muestra "Credenciales inválidas"
    END IF;
END; $$;

GRANT EXECUTE ON FUNCTION auth_login(VARCHAR, TEXT) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

-- Limpiar contador para que puedas volver a intentar sin esperar el bloqueo
DELETE FROM auth_login_intentos;
