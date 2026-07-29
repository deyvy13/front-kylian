-- Listado de productos con filtros opcionales
CREATE OR REPLACE FUNCTION prd_productos_listar(
    p_id_tipo_producto INT     DEFAULT NULL,
    p_fecha_desde      DATE    DEFAULT NULL,
    p_fecha_hasta      DATE    DEFAULT NULL,
    p_texto            VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id                  INT,
    nombre              VARCHAR,
    id_tipo_producto    INT,
    tipo_producto       VARCHAR,
    id_unidad_medida    INT,
    unidad_medida       VARCHAR,
    precio_compra       NUMERIC,
    precio_venta        NUMERIC,
    porcentaje_ganancia NUMERIC,
    ganancia_unitaria   NUMERIC,
    stock_actual        NUMERIC,
    fecha_creacion      TIMESTAMP
)
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.nombre,
        p.id_tipo_producto,
        tp.nombre AS tipo_producto,
        p.id_unidad_medida,
        um.nombre AS unidad_medida,
        p.precio_compra,
        p.precio_venta,
        p.porcentaje_ganancia,
        (p.precio_venta - p.precio_compra) AS ganancia_unitaria,
        p.stock_actual,
        p.fecha_creacion
    FROM prd_productos p
    JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
    JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE p.estado = 1
      AND (p_id_tipo_producto IS NULL OR p.id_tipo_producto = p_id_tipo_producto)
      AND (p_fecha_desde IS NULL OR p.fecha_creacion::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR p.fecha_creacion::DATE <= p_fecha_hasta)
      AND (p_texto IS NULL OR p.nombre ILIKE '%' || p_texto || '%')
    ORDER BY p.fecha_creacion DESC, p.id DESC;
END;
$$;
