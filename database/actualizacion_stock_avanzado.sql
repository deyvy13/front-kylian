-- ============================================================
--  ACTUALIZACIÓN — Stock avanzado
--
--  1. prd_stock_ingresar: al ingresar más stock a otro precio,
--     actualiza precio_compra con PROMEDIO PONDERADO y recalcula
--     precio_venta manteniendo el % de ganancia guardado.
--
--  2. prd_producto_historico(id): totales acumulados por producto.
--
--  3. prd_historico_global(desde, hasta): totales acumulados
--     de todo el sistema en un rango (o vitalicio si null).
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. Ingreso con promedio ponderado ----
CREATE OR REPLACE FUNCTION prd_stock_ingresar(
    p_id_producto     INT,
    p_cantidad        NUMERIC,
    p_precio_unitario NUMERIC,
    p_motivo          VARCHAR,
    p_id_usuario      INT
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_stock         NUMERIC;
    v_precio_actual NUMERIC;
    v_pct_ganancia  NUMERIC;
    v_nuevo_precio  NUMERIC;
    v_nuevo_venta   NUMERIC;
    v_mov_id        INT;
BEGIN
    IF p_cantidad     <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
    IF p_precio_unitario < 0 THEN RAISE EXCEPTION 'El precio unitario no puede ser negativo.'; END IF;

    SELECT stock_actual, precio_compra, porcentaje_ganancia
      INTO v_stock, v_precio_actual, v_pct_ganancia
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;

    -- Promedio ponderado. Si stock actual es 0 → nuevo precio = ingresado.
    IF v_stock > 0 THEN
        v_nuevo_precio := ROUND(
            ((v_stock * v_precio_actual) + (p_cantidad * p_precio_unitario))
             / (v_stock + p_cantidad),
            2
        );
    ELSE
        v_nuevo_precio := p_precio_unitario;
    END IF;

    v_nuevo_venta := ROUND(v_nuevo_precio * (1 + COALESCE(v_pct_ganancia, 0) / 100.0), 2);

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, 1, p_cantidad, p_precio_unitario,
        COALESCE(NULLIF(TRIM(p_motivo), ''), 'Ingreso de stock'),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    UPDATE prd_productos
    SET stock_actual   = stock_actual + p_cantidad,
        precio_compra  = v_nuevo_precio,
        precio_venta   = v_nuevo_venta,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion = NOW()
    WHERE id = p_id_producto;

    RETURN json_build_object(
        'movimiento_id',        v_mov_id,
        'precio_compra_prev',   v_precio_actual,
        'precio_compra_nuevo',  v_nuevo_precio,
        'precio_venta_nuevo',   v_nuevo_venta,
        'cambio_precio',        ABS(v_nuevo_precio - v_precio_actual) > 0.0001
    );
END; $$;

-- ---- 2. Histórico por producto ----
CREATE OR REPLACE FUNCTION prd_producto_historico(p_id INT)
RETURNS TABLE (
    total_ingresado NUMERIC,
    total_vendido   NUMERIC,
    ganancia_total  NUMERIC,
    inversion_total NUMERIC
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad END), 0) AS total_ingresado,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2 THEN m.cantidad END), 0) AS total_vendido,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2
                          THEN m.cantidad * (m.precio_unitario - p.precio_compra) END), 0) AS ganancia_total,
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad * m.precio_unitario END), 0) AS inversion_total
    FROM prd_movimientos m
    JOIN prd_productos p ON p.id = m.id_producto
    WHERE m.estado = 1 AND m.id_producto = p_id;
END; $$;

-- ---- 3. Histórico global ----
CREATE OR REPLACE FUNCTION prd_historico_global(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
)
RETURNS TABLE (
    total_ingresado NUMERIC,
    total_vendido   NUMERIC,
    ganancia_total  NUMERIC,
    inversion_total NUMERIC
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad END), 0),
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2 THEN m.cantidad END), 0),
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2
                          THEN m.cantidad * (m.precio_unitario - p.precio_compra) END), 0),
        COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad * m.precio_unitario END), 0)
    FROM prd_movimientos m
    JOIN prd_productos p ON p.id = m.id_producto
    WHERE m.estado = 1
      AND (p_fecha_desde IS NULL OR m.fecha_movimiento::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR m.fecha_movimiento::DATE <= p_fecha_hasta);
END; $$;

NOTIFY pgrst, 'reload schema';
