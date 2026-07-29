CREATE OR REPLACE FUNCTION prd_productos_actualizar(
    p_id                  INT,
    p_nombre              VARCHAR,
    p_id_tipo_producto    INT,
    p_id_unidad_medida    INT,
    p_precio_compra       NUMERIC,
    p_precio_venta        NUMERIC,
    p_porcentaje_ganancia NUMERIC,
    p_id_usuario          INT
)
RETURNS VOID
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
BEGIN
    UPDATE prd_productos
    SET nombre                  = p_nombre,
        id_tipo_producto        = p_id_tipo_producto,
        id_unidad_medida        = p_id_unidad_medida,
        precio_compra           = p_precio_compra,
        precio_venta            = p_precio_venta,
        porcentaje_ganancia     = p_porcentaje_ganancia,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id AND estado = 1;
END;
$$;
