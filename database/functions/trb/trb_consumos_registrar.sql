-- Registra un consumo: descuenta stock, guarda movimiento y consumo
CREATE OR REPLACE FUNCTION trb_consumos_registrar(
    p_id_trabajador INT,
    p_id_producto   INT,
    p_cantidad      NUMERIC,
    p_id_usuario    INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_precio_venta NUMERIC;
    v_stock        NUMERIC;
    v_nombre_trab  TEXT;
    v_mov_id       INT;
    v_id           INT;
    v_total        NUMERIC;
BEGIN
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;

    SELECT precio_venta, stock_actual INTO v_precio_venta, v_stock
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_precio_venta IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF v_stock < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock; END IF;

    SELECT nombres || ' ' || apellidos INTO v_nombre_trab
    FROM trb_trabajadores WHERE id = p_id_trabajador AND estado = 1;
    IF v_nombre_trab IS NULL THEN
        RAISE EXCEPTION 'Trabajador no encontrado.'; END IF;

    v_total := p_cantidad * v_precio_venta;

    -- Registra movimiento de salida
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, 2, p_cantidad, v_precio_venta,
        'Consumo trabajador: ' || v_nombre_trab, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    -- Descuenta stock
    UPDATE prd_productos
    SET stock_actual = stock_actual - p_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id_producto;

    -- Guarda consumo
    INSERT INTO trb_consumos (id_trabajador, id_producto, cantidad, precio_unitario, total,
        id_movimiento, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_trabajador, p_id_producto, p_cantidad, v_precio_venta, v_total,
        v_mov_id, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;

    RETURN v_id;
END; $$;
