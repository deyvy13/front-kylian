-- ============================================================
--  ACTUALIZACIÓN — Validaciones extra según reporte de QA
--
--  1. prd_productos_eliminar: bloquear también si stock_actual > 0.
--  2. prd_productos_crear: rechazar nombre duplicado (case-insensitive).
--  3. prd_productos_actualizar: mismo chequeo.
--  4. trb_trabajadores_crear/actualizar: detectar DNI ya en la BD
--     (incluso inactivo) y responder amable.
--  5. trb_deudas_por_trabajador: agregar flag `activo`.
--
--  Ejecutar UNA VEZ en el SQL Editor. Idempotente.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. prd_productos_eliminar (stock > 0 también bloquea) ----
CREATE OR REPLACE FUNCTION prd_productos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_mov INT; v_cons INT; v_stock NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_mov  FROM prd_movimientos WHERE id_producto = p_id AND estado = 1;
    SELECT COUNT(*) INTO v_cons FROM trb_consumos    WHERE id_producto = p_id AND estado = 1;
    SELECT stock_actual INTO v_stock FROM prd_productos WHERE id = p_id;

    IF v_stock IS NOT NULL AND v_stock > 0 THEN
        RAISE EXCEPTION 'No se puede quitar el producto: aún tiene % unidad(es) en stock. Registra la salida como consumo o revierte los ingresos primero.', v_stock;
    END IF;
    IF v_mov > 0 OR v_cons > 0 THEN
        RAISE EXCEPTION 'No se puede quitar el producto: tiene % movimiento(s) y % consumo(s) activos. Anúlalos primero.', v_mov, v_cons;
    END IF;

    UPDATE prd_productos
    SET estado = 0,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id;
END; $$;

-- ---- 2. prd_productos_insertar: rechaza duplicado por nombre ----
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

-- ---- 3. prd_productos_actualizar: nombre único ----
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

-- ---- 4. trb_trabajadores_crear: mensaje amable en DNI duplicado (activo o no) ----
CREATE OR REPLACE FUNCTION trb_trabajadores_crear(
    p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR,
    p_labor VARCHAR, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT; v_existe INT;
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;

    SELECT estado INTO v_existe FROM trb_trabajadores WHERE dni = p_dni LIMIT 1;
    IF v_existe = 1 THEN
        RAISE EXCEPTION 'Ya existe un trabajador con ese DNI.'; END IF;
    IF v_existe = 0 THEN
        RAISE EXCEPTION 'Ese DNI ya está registrado a un trabajador inactivo. Contacta a soporte para reactivarlo.'; END IF;

    INSERT INTO trb_trabajadores (nombres, apellidos, dni, labor,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombres, p_apellidos, p_dni, NULLIF(p_labor,''),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ---- 5. trb_deudas_por_trabajador: agrega flag activo ----
DROP FUNCTION IF EXISTS trb_deudas_por_trabajador();
CREATE OR REPLACE FUNCTION trb_deudas_por_trabajador()
RETURNS TABLE (
    id_trabajador INT, trabajador TEXT, dni VARCHAR,
    registros INT, total_deuda NUMERIC, activo INT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, (t.nombres || ' ' || t.apellidos)::TEXT, t.dni,
           COUNT(c.id)::INT, COALESCE(SUM(c.total), 0), t.estado
    FROM trb_trabajadores t
    JOIN trb_consumos c ON c.id_trabajador = t.id
    WHERE c.estado = 1 AND c.pagado = 0 AND c.metodo_pago = 'credito'
    GROUP BY t.id, t.nombres, t.apellidos, t.dni, t.estado
    HAVING COUNT(c.id) > 0
    ORDER BY total_deuda DESC;
END; $$;

-- ---- 6. Asegura permisos para revertirs ----
GRANT EXECUTE ON FUNCTION prd_ingreso_revertir(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trb_pagos_revertir(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION prd_productos_eliminar(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trb_trabajadores_eliminar(INT, INT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
