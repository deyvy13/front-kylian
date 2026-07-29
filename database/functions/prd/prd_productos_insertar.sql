-- Inserta un producto y aplica el stock inicial como movimiento de entrada
CREATE OR REPLACE FUNCTION prd_productos_insertar(
    p_nombre              VARCHAR,
    p_id_tipo_producto    INT,
    p_id_unidad_medida    INT,
    p_precio_compra       NUMERIC,
    p_precio_venta        NUMERIC,
    p_porcentaje_ganancia NUMERIC,
    p_stock_inicial       NUMERIC,
    p_id_usuario          INT
)
RETURNS INT
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO prd_productos (
        nombre, id_tipo_producto, id_unidad_medida,
        precio_compra, precio_venta, porcentaje_ganancia, stock_actual,
        id_usuario_creacion, id_usuario_modificacion
    )
    VALUES (
        p_nombre, p_id_tipo_producto, p_id_unidad_medida,
        p_precio_compra, p_precio_venta, p_porcentaje_ganancia, COALESCE(p_stock_inicial, 0),
        p_id_usuario, p_id_usuario
    )
    RETURNING id INTO v_id;

    IF COALESCE(p_stock_inicial, 0) > 0 THEN
        INSERT INTO prd_movimientos (
            id_producto, tipo_movimiento, cantidad, precio_unitario, motivo,
            id_usuario_creacion, id_usuario_modificacion
        )
        VALUES (
            v_id, 1, p_stock_inicial, p_precio_compra, 'Stock inicial',
            p_id_usuario, p_id_usuario
        );
    END IF;

    RETURN v_id;
END;
$$;
