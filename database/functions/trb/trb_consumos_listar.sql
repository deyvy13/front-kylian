CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador INT  DEFAULT NULL,
    p_fecha_desde   DATE DEFAULT NULL,
    p_fecha_hasta   DATE DEFAULT NULL
)
RETURNS TABLE (
    id                INT,
    id_trabajador     INT,
    trabajador        TEXT,
    dni               VARCHAR,
    id_producto       INT,
    producto          VARCHAR,
    unidad_medida     VARCHAR,
    cantidad          NUMERIC,
    precio_unitario   NUMERIC,
    total             NUMERIC,
    fecha_consumo     TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.id_trabajador,
           (t.nombres || ' ' || t.apellidos)::TEXT AS trabajador, t.dni,
           c.id_producto, p.nombre, um.nombre AS unidad_medida,
           c.cantidad, c.precio_unitario, c.total, c.fecha_consumo
    FROM trb_consumos c
    JOIN trb_trabajadores t ON t.id = c.id_trabajador
    JOIN prd_productos p    ON p.id = c.id_producto
    JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE c.estado = 1
      AND (p_id_trabajador IS NULL OR c.id_trabajador = p_id_trabajador)
      AND (p_fecha_desde IS NULL OR c.fecha_consumo::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR c.fecha_consumo::DATE <= p_fecha_hasta)
    ORDER BY c.fecha_consumo DESC, c.id DESC;
END; $$;
