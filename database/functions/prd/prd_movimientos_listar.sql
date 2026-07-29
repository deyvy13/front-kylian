CREATE OR REPLACE FUNCTION prd_movimientos_listar(
    p_id_producto INT     DEFAULT NULL,
    p_fecha_desde DATE    DEFAULT NULL,
    p_fecha_hasta DATE    DEFAULT NULL,
    p_tipo        INT     DEFAULT NULL
)
RETURNS TABLE (
    id                INT,
    id_producto       INT,
    producto          VARCHAR,
    tipo_movimiento   INT,
    tipo_movimiento_txt TEXT,
    cantidad          NUMERIC,
    precio_unitario   NUMERIC,
    motivo            VARCHAR,
    fecha_movimiento  TIMESTAMP
)
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.id_producto, p.nombre,
           m.tipo_movimiento,
           CASE m.tipo_movimiento WHEN 1 THEN 'Entrada' ELSE 'Salida' END AS tipo_movimiento_txt,
           m.cantidad, m.precio_unitario, m.motivo, m.fecha_movimiento
    FROM prd_movimientos m
    JOIN prd_productos p ON p.id = m.id_producto
    WHERE m.estado = 1
      AND (p_id_producto IS NULL OR m.id_producto = p_id_producto)
      AND (p_fecha_desde IS NULL OR m.fecha_movimiento::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR m.fecha_movimiento::DATE <= p_fecha_hasta)
      AND (p_tipo IS NULL OR m.tipo_movimiento = p_tipo)
    ORDER BY m.fecha_movimiento DESC, m.id DESC;
END;
$$;
