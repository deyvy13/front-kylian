-- ============================================================
--  ACTUALIZACIÓN — Agregados server-side para KPIs
--
--  Devuelve los totales del filtro completo (todas las páginas)
--  en una sola query, para que las StatCards de Productos y
--  Consumos reflejen el universo real, no solo la página cargada.
--
--  Idempotente. Solo lectura, no modifica tablas.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- Productos: total productos, stock, valor de stock y ganancia total ----
CREATE OR REPLACE FUNCTION prd_productos_totales(
    p_id_tipo_producto INT     DEFAULT NULL,
    p_fecha_desde      DATE    DEFAULT NULL,
    p_fecha_hasta      DATE    DEFAULT NULL,
    p_texto            VARCHAR DEFAULT NULL
) RETURNS TABLE (
    total_productos  BIGINT,
    stock_total      NUMERIC,
    valor_stock      NUMERIC,
    ganancia_total   NUMERIC
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(p.stock_actual), 0),
        COALESCE(SUM(p.stock_actual * p.precio_compra), 0),
        COALESCE(SUM(p.stock_actual * (p.precio_venta - p.precio_compra)), 0)
    FROM prd_productos p
    WHERE p.estado = 1
      AND (p_id_tipo_producto IS NULL OR p.id_tipo_producto = p_id_tipo_producto)
      AND (p_fecha_desde IS NULL OR p.fecha_creacion::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR p.fecha_creacion::DATE <= p_fecha_hasta)
      AND (p_texto IS NULL OR p.nombre ILIKE '%' || p_texto || '%');
END; $$;

-- ---- Consumos: registros, cantidad, valor y deuda pendiente ----
CREATE OR REPLACE FUNCTION trb_consumos_totales(
    p_id_trabajador   INT     DEFAULT NULL,
    p_fecha_desde     DATE    DEFAULT NULL,
    p_fecha_hasta     DATE    DEFAULT NULL,
    p_metodo_pago     VARCHAR DEFAULT NULL,
    p_solo_pendientes INT     DEFAULT NULL,
    p_texto           VARCHAR DEFAULT NULL
) RETURNS TABLE (
    registros       BIGINT,
    cantidad_total  NUMERIC,
    valor_total     NUMERIC,
    deuda_total     NUMERIC
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(c.cantidad), 0),
        COALESCE(SUM(c.total), 0),
        COALESCE(SUM(CASE
            WHEN c.metodo_pago = 'credito' AND c.pagado = 0 THEN c.total ELSE 0
        END), 0)
    FROM trb_consumos c
    LEFT JOIN trb_trabajadores t ON t.id = c.id_trabajador
    JOIN prd_productos p ON p.id = c.id_producto
    WHERE c.estado = 1
      AND (p_id_trabajador IS NULL OR c.id_trabajador = p_id_trabajador)
      AND (p_fecha_desde  IS NULL OR c.fecha_consumo::DATE >= p_fecha_desde)
      AND (p_fecha_hasta  IS NULL OR c.fecha_consumo::DATE <= p_fecha_hasta)
      AND (p_metodo_pago  IS NULL OR c.metodo_pago = LOWER(p_metodo_pago))
      AND (p_solo_pendientes IS NULL
           OR (p_solo_pendientes = 1 AND c.pagado = 0)
           OR (p_solo_pendientes = 0 AND c.pagado = 1))
      AND (p_texto IS NULL
           OR p.nombre ILIKE '%' || p_texto || '%'
           OR COALESCE(t.nombres, '')   ILIKE '%' || p_texto || '%'
           OR COALESCE(t.apellidos, '') ILIKE '%' || p_texto || '%'
           OR COALESCE(t.dni, '')       ILIKE '%' || p_texto || '%');
END; $$;

NOTIFY pgrst, 'reload schema';
