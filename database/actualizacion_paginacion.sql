-- ============================================================
--  ACTUALIZACIÓN — Paginación server-side en los listados grandes
--
--  Añade parámetros opcionales p_limit e p_offset a:
--    · prd_productos_listar
--    · trb_consumos_listar
--    · trb_trabajadores_listar
--    · gst_gastos_listar
--
--  Cada función devuelve una columna extra "total_count" con el
--  total real (sin paginar), calculado con COUNT(*) OVER ().
--
--  Cuando p_limit es NULL, LIMIT queda sin efecto y se devuelven
--  todos los registros — comportamiento retrocompatible con los
--  llamadores que aún no envían paginación (SearchSelects, etc).
--
--  Idempotente. No modifica tablas ni datos.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ============================================================
-- 1. prd_productos_listar
-- ============================================================
DROP FUNCTION IF EXISTS prd_productos_listar(INT, DATE, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION prd_productos_listar(
    p_id_tipo_producto INT     DEFAULT NULL,
    p_fecha_desde      DATE    DEFAULT NULL,
    p_fecha_hasta      DATE    DEFAULT NULL,
    p_texto            VARCHAR DEFAULT NULL,
    p_limit            INT     DEFAULT NULL,
    p_offset           INT     DEFAULT 0
)
RETURNS TABLE (
    id INT, nombre VARCHAR, id_tipo_producto INT, tipo_producto VARCHAR,
    id_unidad_medida INT, unidad_medida VARCHAR,
    precio_compra NUMERIC, precio_venta NUMERIC, porcentaje_ganancia NUMERIC,
    ganancia_unitaria NUMERIC, stock_actual NUMERIC,
    stock_total_historico NUMERIC,
    fecha_creacion TIMESTAMP,
    total_count BIGINT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, p.id_tipo_producto, tp.nombre, p.id_unidad_medida, um.nombre,
           p.precio_compra, p.precio_venta, p.porcentaje_ganancia,
           (p.precio_venta - p.precio_compra),
           p.stock_actual,
           COALESCE((
               SELECT SUM(m.cantidad) FROM prd_movimientos m
               WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
           ), 0) AS stock_total_historico,
           p.fecha_creacion,
           COUNT(*) OVER ()::BIGINT AS total_count
    FROM prd_productos p
    JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
    LEFT JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE p.estado = 1
      AND (p_id_tipo_producto IS NULL OR p.id_tipo_producto = p_id_tipo_producto)
      AND (p_fecha_desde IS NULL OR p.fecha_creacion::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR p.fecha_creacion::DATE <= p_fecha_hasta)
      AND (p_texto IS NULL OR p.nombre ILIKE '%' || p_texto || '%')
    ORDER BY p.fecha_creacion DESC, p.id DESC
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END; $$;

-- ============================================================
-- 2. trb_consumos_listar
-- ============================================================
DROP FUNCTION IF EXISTS trb_consumos_listar(INT, DATE, DATE, VARCHAR, INT);
CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador   INT     DEFAULT NULL,
    p_fecha_desde     DATE    DEFAULT NULL,
    p_fecha_hasta     DATE    DEFAULT NULL,
    p_metodo_pago     VARCHAR DEFAULT NULL,
    p_solo_pendientes INT     DEFAULT NULL,
    p_limit           INT     DEFAULT NULL,
    p_offset          INT     DEFAULT 0
) RETURNS TABLE (
    id INT, id_trabajador INT, trabajador TEXT, dni VARCHAR, trabajador_activo INT,
    id_producto INT, producto VARCHAR, producto_activo INT, unidad_medida VARCHAR,
    cantidad NUMERIC, precio_unitario NUMERIC, total NUMERIC,
    metodo_pago VARCHAR, pagado INT, id_pago INT,
    fecha_consumo TIMESTAMP,
    total_count BIGINT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.id_trabajador,
           COALESCE((t.nombres || ' ' || t.apellidos), '(sin trabajador)')::TEXT,
           t.dni, COALESCE(t.estado, 1),
           c.id_producto, p.nombre, COALESCE(p.estado, 1), um.nombre,
           c.cantidad, c.precio_unitario, c.total,
           c.metodo_pago, c.pagado, c.id_pago,
           c.fecha_consumo,
           COUNT(*) OVER ()::BIGINT AS total_count
    FROM trb_consumos c
    LEFT JOIN trb_trabajadores t ON t.id = c.id_trabajador
    JOIN prd_productos p ON p.id = c.id_producto
    LEFT JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE c.estado = 1
      AND (p_id_trabajador IS NULL OR c.id_trabajador = p_id_trabajador)
      AND (p_fecha_desde  IS NULL OR c.fecha_consumo::DATE >= p_fecha_desde)
      AND (p_fecha_hasta  IS NULL OR c.fecha_consumo::DATE <= p_fecha_hasta)
      AND (p_metodo_pago  IS NULL OR c.metodo_pago = LOWER(p_metodo_pago))
      AND (p_solo_pendientes IS NULL
           OR (p_solo_pendientes = 1 AND c.pagado = 0)
           OR (p_solo_pendientes = 0 AND c.pagado = 1))
    ORDER BY c.fecha_consumo DESC, c.id DESC
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END; $$;

-- ============================================================
-- 3. trb_trabajadores_listar
-- ============================================================
DROP FUNCTION IF EXISTS trb_trabajadores_listar(VARCHAR, INT);
CREATE OR REPLACE FUNCTION trb_trabajadores_listar(
    p_texto  VARCHAR DEFAULT NULL,
    p_estado INT     DEFAULT 1,
    p_limit  INT     DEFAULT NULL,
    p_offset INT     DEFAULT 0
)
RETURNS TABLE (
    id INT, nombres VARCHAR, apellidos VARCHAR, dni VARCHAR, labor VARCHAR,
    fecha_creacion TIMESTAMP, estado INT,
    total_count BIGINT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.nombres, t.apellidos, t.dni, t.labor, t.fecha_creacion, t.estado,
           COUNT(*) OVER ()::BIGINT AS total_count
    FROM trb_trabajadores t
    WHERE t.estado = COALESCE(p_estado, 1)
      AND (p_texto IS NULL OR t.nombres ILIKE '%'||p_texto||'%'
           OR t.apellidos ILIKE '%'||p_texto||'%' OR t.dni ILIKE '%'||p_texto||'%'
           OR COALESCE(t.labor,'') ILIKE '%'||p_texto||'%')
    ORDER BY t.apellidos, t.nombres
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END; $$;

-- ============================================================
-- 4. gst_gastos_listar
-- ============================================================
DROP FUNCTION IF EXISTS gst_gastos_listar(DATE, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION gst_gastos_listar(
    p_fecha_desde DATE    DEFAULT NULL,
    p_fecha_hasta DATE    DEFAULT NULL,
    p_texto       VARCHAR DEFAULT NULL,
    p_limit       INT     DEFAULT NULL,
    p_offset      INT     DEFAULT 0
)
RETURNS TABLE (
    id INT, monto NUMERIC, concepto VARCHAR, fecha_gasto DATE, fecha_creacion TIMESTAMP,
    total_count BIGINT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.monto, g.concepto, g.fecha_gasto, g.fecha_creacion,
           COUNT(*) OVER ()::BIGINT AS total_count
    FROM gst_gastos g
    WHERE g.estado = 1
      AND (p_fecha_desde IS NULL OR g.fecha_gasto >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR g.fecha_gasto <= p_fecha_hasta)
      AND (p_texto IS NULL OR g.concepto ILIKE '%'||p_texto||'%')
    ORDER BY g.fecha_gasto DESC, g.id DESC
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END; $$;

NOTIFY pgrst, 'reload schema';
