-- Si p_password es NULL o vacío, no se actualiza la contraseña
CREATE OR REPLACE FUNCTION auth_usuarios_actualizar(
    p_id         INT,
    p_nombre     VARCHAR,
    p_correo     VARCHAR,
    p_password   TEXT,
    p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = p_correo AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado en otro usuario.';
    END IF;
    IF p_password IS NOT NULL AND LENGTH(p_password) > 0 AND LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.';
    END IF;

    UPDATE auth_usuarios
    SET nombre = p_nombre,
        correo = LOWER(p_correo),
        password_hash = CASE
            WHEN p_password IS NOT NULL AND LENGTH(p_password) > 0
                THEN crypt(p_password, gen_salt('bf'))
            ELSE password_hash END,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;
