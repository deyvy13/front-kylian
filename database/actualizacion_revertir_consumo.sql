-- ============================================================
--  ACTUALIZACIÓN — "Revertir consumo"
--  Elimina el registro de trb_consumos, borra su movimiento
--  asociado y devuelve la cantidad al stock del producto.
--  Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- ============================================================
SET TIME ZONE 'America/Lima';

CREATE OR REPLACE FUNCTION trb_consumos_revertir(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_cantidad    NUMERIC;
    v_id_producto INT;
    v_id_mov      INT;
BEGIN
    SELECT cantidad, id_producto, id_movimiento
      INTO v_cantidad, v_id_producto, v_id_mov
    FROM trb_consumos WHERE id = p_id;
    IF v_cantidad IS NULL THEN RETURN; END IF;

    -- Devolver stock
    UPDATE prd_productos
    SET stock_actual = stock_actual + v_cantidad,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = v_id_producto;

    -- Borrar movimiento asociado (hard delete)
    IF v_id_mov IS NOT NULL THEN
        DELETE FROM prd_movimientos WHERE id = v_id_mov;
    END IF;

    -- Borrar consumo (hard delete)
    DELETE FROM trb_consumos WHERE id = p_id;
END; $$;
