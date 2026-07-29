-- Soft delete + revierte el stock del producto asociado
CREATE OR REPLACE FUNCTION trb_consumos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_cantidad     NUMERIC;
    v_id_producto  INT;
    v_id_mov       INT;
BEGIN
    SELECT cantidad, id_producto, id_movimiento
      INTO v_cantidad, v_id_producto, v_id_mov
    FROM trb_consumos WHERE id = p_id AND estado = 1;
    IF v_cantidad IS NULL THEN RETURN; END IF;

    UPDATE trb_consumos SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;

    IF v_id_mov IS NOT NULL THEN
        UPDATE prd_movimientos SET estado = 0,
            id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
        WHERE id = v_id_mov;
    END IF;

    UPDATE prd_productos SET stock_actual = stock_actual + v_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = v_id_producto;
END; $$;
