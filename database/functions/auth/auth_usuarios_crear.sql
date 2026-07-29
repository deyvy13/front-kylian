CREATE OR REPLACE FUNCTION auth_usuarios_crear(
    p_nombre     VARCHAR,
    p_correo     VARCHAR,
    p_password   TEXT,
    p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = p_correo AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado.';
    END IF;
    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
    END IF;

    INSERT INTO auth_usuarios (nombre, correo, password_hash,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombre, LOWER(p_correo), crypt(p_password, gen_salt('bf')),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;
