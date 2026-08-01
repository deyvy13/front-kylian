-- ============================================================
--  ACTUALIZACIÓN — Integridad referencial + operaciones inversas
--
--  Fixes del reporte de QA:
--   1. Prevenir eliminación de PRODUCTOS con movimientos o consumos.
--   2. Prevenir eliminación de TRABAJADORES con créditos pendientes.
--   3. Nueva función: revertir un PAGO (deja los consumos como pendientes).
--   4. Nueva función: revertir un INGRESO individual (movimiento tipo=1).
--
--  Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. prd_productos_eliminar: bloquea si hay dependencias activas ----
CREATE OR REPLACE FUNCTION prd_productos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_mov INT; v_cons INT;
BEGIN
    SELECT COUNT(*) INTO v_mov
    FROM prd_movimientos WHERE id_producto = p_id AND estado = 1;
    SELECT COUNT(*) INTO v_cons
    FROM trb_consumos WHERE id_producto = p_id AND estado = 1;

    IF v_mov > 0 OR v_cons > 0 THEN
        RAISE EXCEPTION 'No se puede quitar el producto: tiene % movimiento(s) y % consumo(s) activos. Anúlalos primero.', v_mov, v_cons;
    END IF;

    UPDATE prd_productos
    SET estado = 0,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id;
END; $$;

-- ---- 2. trb_trabajadores_eliminar: bloquea si hay créditos pendientes ----
CREATE OR REPLACE FUNCTION trb_trabajadores_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_deuda INT;
BEGIN
    SELECT COUNT(*) INTO v_deuda
    FROM trb_consumos
    WHERE id_trabajador = p_id
      AND estado = 1 AND metodo_pago = 'credito' AND pagado = 0;

    IF v_deuda > 0 THEN
        RAISE EXCEPTION 'No se puede quitar al trabajador: tiene % crédito(s) pendiente(s) de pago. Regístralos como pagados o revierte esos consumos primero.', v_deuda;
    END IF;

    UPDATE trb_trabajadores
    SET estado = 0,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id;
END; $$;

-- ---- 3. trb_pagos_revertir: anula un pago dejando los consumos como pendientes ----
CREATE OR REPLACE FUNCTION trb_pagos_revertir(p_id_pago INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    -- Consumos vuelven a estar pendientes
    UPDATE trb_consumos
    SET pagado = 0,
        id_pago = NULL,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id_pago = p_id_pago;

    -- Eliminar el pago (hard delete)
    DELETE FROM trb_pagos WHERE id = p_id_pago;
END; $$;

-- ---- 4. prd_ingreso_revertir: anula un movimiento de entrada individual ----
--       No permite dejar el stock en negativo. No recalcula precio_compra
--       (el promedio ponderado del pasado no se puede reconstruir sin
--       historizarlo). Actualiza solo el stock.
CREATE OR REPLACE FUNCTION prd_ingreso_revertir(p_id_movimiento INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_tipo        INT;
    v_id_producto INT;
    v_cantidad    NUMERIC;
    v_stock       NUMERIC;
BEGIN
    SELECT tipo_movimiento, id_producto, cantidad
      INTO v_tipo, v_id_producto, v_cantidad
    FROM prd_movimientos WHERE id = p_id_movimiento AND estado = 1;
    IF v_tipo IS NULL THEN
        RAISE EXCEPTION 'Movimiento no encontrado o ya anulado.'; END IF;
    IF v_tipo <> 1 THEN
        RAISE EXCEPTION 'Solo se pueden revertir movimientos de entrada.'; END IF;

    SELECT stock_actual INTO v_stock FROM prd_productos WHERE id = v_id_producto;
    IF v_stock < v_cantidad THEN
        RAISE EXCEPTION 'No se puede anular: el stock actual (%) es menor que la cantidad a revertir (%).', v_stock, v_cantidad;
    END IF;

    UPDATE prd_productos
    SET stock_actual = stock_actual - v_cantidad,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = v_id_producto;

    DELETE FROM prd_movimientos WHERE id = p_id_movimiento;
END; $$;

-- ---- 5. trb_deudas_por_trabajador: incluir también trabajadores eliminados
--       para poder cobrar deudas "huérfanas" si por alguna razón quedan.
CREATE OR REPLACE FUNCTION trb_deudas_por_trabajador()
RETURNS TABLE (
    id_trabajador INT, trabajador TEXT, dni VARCHAR,
    registros INT, total_deuda NUMERIC
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, (t.nombres || ' ' || t.apellidos)::TEXT, t.dni,
           COUNT(c.id)::INT, COALESCE(SUM(c.total), 0)
    FROM trb_trabajadores t
    JOIN trb_consumos c ON c.id_trabajador = t.id
    WHERE c.estado = 1 AND c.pagado = 0 AND c.metodo_pago = 'credito'
      -- SIN filtro por t.estado: incluye eliminados para no perder cobrabilidad
    GROUP BY t.id, t.nombres, t.apellidos, t.dni
    HAVING COUNT(c.id) > 0
    ORDER BY total_deuda DESC;
END; $$;

NOTIFY pgrst, 'reload schema';
