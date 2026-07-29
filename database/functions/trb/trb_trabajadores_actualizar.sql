CREATE OR REPLACE FUNCTION trb_trabajadores_actualizar(
    p_id INT, p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe otro trabajador con ese DNI.'; END IF;

    UPDATE trb_trabajadores
    SET nombres = p_nombres, apellidos = p_apellidos, dni = p_dni,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;
