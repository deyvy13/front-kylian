CREATE OR REPLACE FUNCTION trb_trabajadores_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE trb_trabajadores SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;
