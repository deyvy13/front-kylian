-- ============================================================
--  ACTUALIZACIÓN — Búsqueda de texto en trb_consumos_listar
--  Agrega parámetro opcional p_texto que matchea por:
--    · nombre del producto
--    · nombres/apellidos del trabajador
--    · DNI del trabajador
--  Idempotente. No modifica tablas.
-- ============================================================
SET TIME ZONE 'America/Lima';

DROP FUNCTION IF EXISTS trb_consumos_listar(INT, DATE, DATE, VARCHAR, INT, INT, INT);
CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador   INT     DEFAULT NULL,
    p_fecha_desde     DATE    DEFAULT NULL,
    p_fecha_hasta     DATE    DEFAULT NULL,
    p_metodo_pago     VARCHAR DEFAULT NULL,
    p_solo_pendientes INT     DEFAULT NULL,
    p_limit           INT     DEFAULT NULL,
    p_offset          INT     DEFAULT 0,
    p_texto           VARCHAR DEFAULT NULL
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
      AND (p_texto IS NULL
           OR p.nombre ILIKE '%' || p_texto || '%'
           OR COALESCE(t.nombres, '')   ILIKE '%' || p_texto || '%'
           OR COALESCE(t.apellidos, '') ILIKE '%' || p_texto || '%'
           OR COALESCE(t.dni, '')       ILIKE '%' || p_texto || '%')
    ORDER BY c.fecha_consumo DESC, c.id DESC
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END; $$;

NOTIFY pgrst, 'reload schema';
