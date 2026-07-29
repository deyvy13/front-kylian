-- Registra un movimiento (entrada = 1 / salida = 2) y actualiza el stock del producto
CREATE OR REPLACE FUNCTION prd_movimientos_registrar(
    p_id_producto     INT,
    p_tipo_movimiento INT,
    p_cantidad        NUMERIC,
    p_precio_unitario NUMERIC,
    p_motivo          VARCHAR,
    p_id_usuario      INT
)
RETURNS INT
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
DECLARE
    v_id           INT;
    v_stock_actual NUMERIC;
BEGIN
    IF p_tipo_movimiento NOT IN (1, 2) THEN
        RAISE EXCEPTION 'Tipo de movimiento inválido (1=entrada, 2=salida).';
    END IF;

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a cero.';
    END IF;

    SELECT stock_actual INTO v_stock_actual
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;

    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado.';
    END IF;

    IF p_tipo_movimiento = 2 AND v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock_actual;
    END IF;

    INSERT INTO prd_movimientos (
        id_producto, tipo_movimiento, cantidad, precio_unitario, motivo,
        id_usuario_creacion, id_usuario_modificacion
    )
    VALUES (
        p_id_producto, p_tipo_movimiento, p_cantidad, COALESCE(p_precio_unitario, 0), p_motivo,
        p_id_usuario, p_id_usuario
    )
    RETURNING id INTO v_id;

    UPDATE prd_productos
    SET stock_actual = CASE
            WHEN p_tipo_movimiento = 1 THEN stock_actual + p_cantidad
            ELSE stock_actual - p_cantidad
        END,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id_producto;

    RETURN v_id;
END;
$$;
