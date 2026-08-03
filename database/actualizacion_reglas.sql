-- ============================================================
--  ACTUALIZACIÓN — Reglas de negocio y nuevos flujos
--
--  1. Unidad de medida opcional al crear producto.
--  2. Eliminar producto solo se bloquea si stock > 0. Los consumos y
--     movimientos históricos NO impiden la baja — el producto queda
--     como "(eliminado)" en los reportes.
--  3. trb_trabajadores_listar acepta filtro por estado (activos/eliminados).
--  4. trb_trabajadores_reactivar: vuelve a activar (estado=1).
--  5. trb_trabajador_resumen(id): total consumido, pagado y deuda.
--  6. trb_consumos_listar devuelve flags producto_activo/trabajador_activo
--     para que la UI muestre "(eliminado)".
--
--  Ejecutar UNA VEZ en el SQL Editor.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. unidad_medida opcional en prd_productos ----
ALTER TABLE prd_productos ALTER COLUMN id_unidad_medida DROP NOT NULL;

-- ---- 2. prd_productos_insertar: unidad opcional ----
DROP FUNCTION IF EXISTS prd_productos_insertar(VARCHAR, INT, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT);
CREATE OR REPLACE FUNCTION prd_productos_insertar(
    p_nombre VARCHAR, p_id_tipo_producto INT, p_id_unidad_medida INT,
    p_precio_compra NUMERIC, p_precio_venta NUMERIC, p_porcentaje_ganancia NUMERIC,
    p_stock_inicial NUMERIC, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM prd_productos
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(p_nombre)) AND estado = 1
    ) THEN
        RAISE EXCEPTION 'Ya existe un producto activo con ese nombre.';
    END IF;

    INSERT INTO prd_productos (nombre, id_tipo_producto, id_unidad_medida,
        precio_compra, precio_venta, porcentaje_ganancia, stock_actual,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombre, p_id_tipo_producto, p_id_unidad_medida,
        p_precio_compra, p_precio_venta, p_porcentaje_ganancia, COALESCE(p_stock_inicial,0),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;

    IF COALESCE(p_stock_inicial, 0) > 0 THEN
        INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
            motivo, id_usuario_creacion, id_usuario_modificacion)
        VALUES (v_id, 1, p_stock_inicial, p_precio_compra, 'Stock inicial',
            p_id_usuario, p_id_usuario);
    END IF;
    RETURN v_id;
END; $$;

-- ---- 3. prd_productos_actualizar: unidad opcional ----
CREATE OR REPLACE FUNCTION prd_productos_actualizar(
    p_id INT, p_nombre VARCHAR, p_id_tipo_producto INT, p_id_unidad_medida INT,
    p_precio_compra NUMERIC, p_precio_venta NUMERIC, p_porcentaje_ganancia NUMERIC,
    p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM prd_productos
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(p_nombre))
          AND id <> p_id AND estado = 1
    ) THEN
        RAISE EXCEPTION 'Ya existe otro producto activo con ese nombre.';
    END IF;

    UPDATE prd_productos
    SET nombre = p_nombre, id_tipo_producto = p_id_tipo_producto,
        id_unidad_medida = p_id_unidad_medida, precio_compra = p_precio_compra,
        precio_venta = p_precio_venta, porcentaje_ganancia = p_porcentaje_ganancia,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

-- ---- 4. prd_productos_eliminar: SOLO bloquear si stock > 0 ----
CREATE OR REPLACE FUNCTION prd_productos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_stock NUMERIC;
BEGIN
    SELECT stock_actual INTO v_stock FROM prd_productos WHERE id = p_id;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF v_stock > 0 THEN
        RAISE EXCEPTION 'No se puede quitar el producto: aún tiene % unidad(es) en stock. Registra las salidas primero.', v_stock;
    END IF;

    UPDATE prd_productos
    SET estado = 0,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id;
END; $$;

-- ---- 5. trb_trabajadores_listar: acepta estado ----
DROP FUNCTION IF EXISTS trb_trabajadores_listar(VARCHAR);
CREATE OR REPLACE FUNCTION trb_trabajadores_listar(
    p_texto  VARCHAR DEFAULT NULL,
    p_estado INT     DEFAULT 1  -- 1 = activos, 0 = eliminados
)
RETURNS TABLE (id INT, nombres VARCHAR, apellidos VARCHAR, dni VARCHAR, labor VARCHAR, fecha_creacion TIMESTAMP, estado INT)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.nombres, t.apellidos, t.dni, t.labor, t.fecha_creacion, t.estado
    FROM trb_trabajadores t
    WHERE t.estado = COALESCE(p_estado, 1)
      AND (p_texto IS NULL OR t.nombres ILIKE '%'||p_texto||'%'
           OR t.apellidos ILIKE '%'||p_texto||'%' OR t.dni ILIKE '%'||p_texto||'%'
           OR COALESCE(t.labor,'') ILIKE '%'||p_texto||'%')
    ORDER BY t.apellidos, t.nombres;
END; $$;

-- ---- 6. trb_trabajadores_reactivar ----
CREATE OR REPLACE FUNCTION trb_trabajadores_reactivar(p_id INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE trb_trabajadores
    SET estado = 1,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id AND estado = 0;
END; $$;

-- ---- 7. trb_trabajador_resumen(id): totales por trabajador ----
CREATE OR REPLACE FUNCTION trb_trabajador_resumen(p_id INT)
RETURNS TABLE (
    total_consumido  NUMERIC,
    total_pagado     NUMERIC,
    total_deuda      NUMERIC,
    n_consumos       INT,
    n_pagos          INT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(total) FROM trb_consumos
                  WHERE id_trabajador = p_id AND estado = 1), 0)                          AS total_consumido,
        COALESCE((SELECT SUM(total) FROM trb_consumos
                  WHERE id_trabajador = p_id AND estado = 1
                    AND metodo_pago = 'credito' AND pagado = 1), 0)                       AS total_pagado,
        COALESCE((SELECT SUM(total) FROM trb_consumos
                  WHERE id_trabajador = p_id AND estado = 1
                    AND metodo_pago = 'credito' AND pagado = 0), 0)                       AS total_deuda,
        (SELECT COUNT(*)::INT FROM trb_consumos WHERE id_trabajador = p_id AND estado = 1) AS n_consumos,
        (SELECT COUNT(*)::INT FROM trb_pagos     WHERE id_trabajador = p_id AND estado = 1) AS n_pagos;
END; $$;

-- ---- 8. trb_consumos_listar: agrega flags de estado producto/trabajador ----
DROP FUNCTION IF EXISTS trb_consumos_listar(INT, DATE, DATE, VARCHAR, INT);
CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador   INT     DEFAULT NULL,
    p_fecha_desde     DATE    DEFAULT NULL,
    p_fecha_hasta     DATE    DEFAULT NULL,
    p_metodo_pago     VARCHAR DEFAULT NULL,
    p_solo_pendientes INT     DEFAULT NULL
) RETURNS TABLE (
    id INT, id_trabajador INT, trabajador TEXT, dni VARCHAR, trabajador_activo INT,
    id_producto INT, producto VARCHAR, producto_activo INT, unidad_medida VARCHAR,
    cantidad NUMERIC, precio_unitario NUMERIC, total NUMERIC,
    metodo_pago VARCHAR, pagado INT, id_pago INT,
    fecha_consumo TIMESTAMP
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
           c.fecha_consumo
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
    ORDER BY c.fecha_consumo DESC, c.id DESC;
END; $$;

-- ---- 9. prd_productos_listar: unidad_medida ahora puede ser NULL ----
DROP FUNCTION IF EXISTS prd_productos_listar(INT, DATE, DATE, VARCHAR);
CREATE OR REPLACE FUNCTION prd_productos_listar(
    p_id_tipo_producto INT     DEFAULT NULL,
    p_fecha_desde      DATE    DEFAULT NULL,
    p_fecha_hasta      DATE    DEFAULT NULL,
    p_texto            VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id INT, nombre VARCHAR, id_tipo_producto INT, tipo_producto VARCHAR,
    id_unidad_medida INT, unidad_medida VARCHAR,
    precio_compra NUMERIC, precio_venta NUMERIC, porcentaje_ganancia NUMERIC,
    ganancia_unitaria NUMERIC, stock_actual NUMERIC, fecha_creacion TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, p.id_tipo_producto, tp.nombre, p.id_unidad_medida, um.nombre,
           p.precio_compra, p.precio_venta, p.porcentaje_ganancia,
           (p.precio_venta - p.precio_compra), p.stock_actual, p.fecha_creacion
    FROM prd_productos p
    JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
    LEFT JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE p.estado = 1
      AND (p_id_tipo_producto IS NULL OR p.id_tipo_producto = p_id_tipo_producto)
      AND (p_fecha_desde IS NULL OR p.fecha_creacion::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR p.fecha_creacion::DATE <= p_fecha_hasta)
      AND (p_texto IS NULL OR p.nombre ILIKE '%' || p_texto || '%')
    ORDER BY p.fecha_creacion DESC, p.id DESC;
END; $$;

GRANT EXECUTE ON FUNCTION trb_trabajadores_reactivar(INT, INT) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
