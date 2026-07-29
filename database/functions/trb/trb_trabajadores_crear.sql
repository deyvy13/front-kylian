CREATE OR REPLACE FUNCTION trb_trabajadores_crear(
    p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe un trabajador con ese DNI.'; END IF;

    INSERT INTO trb_trabajadores (nombres, apellidos, dni,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombres, p_apellidos, p_dni, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;
