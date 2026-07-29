-- KPIs y series para el dashboard, filtrable por rango de fechas
CREATE OR REPLACE FUNCTION prd_dashboard_resumen(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
DECLARE
    v_desde DATE := COALESCE(p_fecha_desde, (NOW() AT TIME ZONE 'America/Lima')::DATE - INTERVAL '30 days');
    v_hasta DATE := COALESCE(p_fecha_hasta, (NOW() AT TIME ZONE 'America/Lima')::DATE);
    v_result JSON;
BEGIN
    WITH movimientos AS (
        SELECT m.*, p.precio_compra, p.precio_venta
        FROM prd_movimientos m
        JOIN prd_productos p ON p.id = m.id_producto
        WHERE m.estado = 1
          AND m.fecha_movimiento::DATE BETWEEN v_desde AND v_hasta
    ),
    kpis AS (
        SELECT
            (SELECT COUNT(*) FROM prd_productos WHERE estado = 1) AS total_productos,
            (SELECT COALESCE(SUM(stock_actual), 0) FROM prd_productos WHERE estado = 1) AS stock_total,
            (SELECT COALESCE(SUM(stock_actual * precio_compra), 0) FROM prd_productos WHERE estado = 1) AS valor_inventario,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 1 THEN cantidad ELSE 0 END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 2 THEN cantidad ELSE 0 END), 0) AS salidas,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 2 THEN cantidad * (precio_venta - precio_compra) ELSE 0 END), 0) AS ganancia_estimada
        FROM movimientos
    ),
    serie AS (
        SELECT
            d::DATE AS fecha,
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad END), 0) AS entradas,
            COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2 THEN m.cantidad END), 0) AS salidas
        FROM generate_series(v_desde, v_hasta, INTERVAL '1 day') d
        LEFT JOIN movimientos m ON m.fecha_movimiento::DATE = d::DATE
        GROUP BY d
        ORDER BY d
    ),
    por_tipo AS (
        SELECT tp.nombre AS tipo,
               COUNT(p.id)                     AS productos,
               COALESCE(SUM(p.stock_actual),0) AS stock
        FROM prd_productos p
        JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
        WHERE p.estado = 1
        GROUP BY tp.nombre
        ORDER BY productos DESC
    )
    SELECT json_build_object(
        'rango', json_build_object('desde', v_desde, 'hasta', v_hasta),
        'kpis',  (SELECT row_to_json(k) FROM kpis k),
        'serie', (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM serie s),
        'por_tipo', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM por_tipo t)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
