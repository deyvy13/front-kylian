CREATE OR REPLACE FUNCTION auth_usuarios_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF p_id = 1 THEN
        RAISE EXCEPTION 'El usuario administrador no puede eliminarse.';
    END IF;
    UPDATE auth_usuarios
    SET estado = 0,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id;
END; $$;
