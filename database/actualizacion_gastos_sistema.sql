-- ============================================================
--  ACTUALIZACIÓN — Marcar gastos automáticos como "(Sistema)"
--
--  Reemplaza el marcador técnico "(Mov#N)" por "(Sistema)":
--    · más amigable en el listado del usuario
--    · el vínculo lógico gasto ↔ movimiento se resuelve al
--      revertir usando producto + monto + fecha del movimiento
--
--  Idempotente. Ejecutar UNA VEZ. Todo dentro de una transacción.
-- ============================================================
SET TIME ZONE 'America/Lima';

BEGIN;

-- ============================================================
-- 1. Migración: renombra los conceptos existentes
--    "Compra: X (Mov#123)" → "Compra: X (Sistema)"
-- ============================================================
UPDATE gst_gastos
SET concepto = regexp_replace(concepto, '\s*\(Mov#\d+\)\s*$', ' (Sistema)')
WHERE concepto ~ '\(Mov#\d+\)\s*$';

-- ============================================================
-- 2. prd_stock_ingresar — usa "(Sistema)"
-- ============================================================
CREATE OR REPLACE FUNCTION prd_stock_ingresar(
    p_id_producto     INT,
    p_cantidad        NUMERIC,
    p_precio_unitario NUMERIC,
    p_motivo          VARCHAR,
    p_id_usuario      INT
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_stock          NUMERIC;
    v_precio_actual  NUMERIC;
    v_pct_ganancia   NUMERIC;
    v_nombre         VARCHAR;
    v_nuevo_precio   NUMERIC;
    v_nuevo_venta    NUMERIC;
    v_mov_id         INT;
    v_monto_gasto    NUMERIC;
BEGIN
    IF p_cantidad     <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
    IF p_precio_unitario < 0 THEN RAISE EXCEPTION 'El precio unitario no puede ser negativo.'; END IF;

    SELECT stock_actual, precio_compra, porcentaje_ganancia, nombre
      INTO v_stock, v_precio_actual, v_pct_ganancia, v_nombre
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;

    IF v_stock > 0 THEN
        v_nuevo_precio := ROUND(
            ((v_stock * v_precio_actual) + (p_cantidad * p_precio_unitario))
             / (v_stock + p_cantidad), 2);
    ELSE
        v_nuevo_precio := p_precio_unitario;
    END IF;
    v_nuevo_venta := ROUND(v_nuevo_precio * (1 + COALESCE(v_pct_ganancia, 0) / 100.0), 2);

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, 1, p_cantidad, p_precio_unitario,
        COALESCE(NULLIF(TRIM(p_motivo), ''), 'Ingreso de stock'),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    UPDATE prd_productos
    SET stock_actual   = stock_actual + p_cantidad,
        precio_compra  = v_nuevo_precio,
        precio_venta   = v_nuevo_venta,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion = NOW()
    WHERE id = p_id_producto;

    v_monto_gasto := ROUND(p_cantidad * p_precio_unitario, 2);
    IF v_monto_gasto > 0 THEN
        INSERT INTO gst_gastos (monto, concepto, fecha_gasto,
            id_usuario_creacion, id_usuario_modificacion)
        VALUES (v_monto_gasto,
            'Compra: ' || v_nombre || ' (Sistema)',
            (NOW() AT TIME ZONE 'America/Lima')::DATE,
            p_id_usuario, p_id_usuario);
    END IF;

    RETURN json_build_object(
        'movimiento_id',        v_mov_id,
        'precio_compra_prev',   v_precio_actual,
        'precio_compra_nuevo',  v_nuevo_precio,
        'precio_venta_nuevo',   v_nuevo_venta,
        'cambio_precio',        ABS(v_nuevo_precio - v_precio_actual) > 0.0001,
        'gasto_registrado',     v_monto_gasto > 0
    );
END; $$;

-- ============================================================
-- 3. prd_productos_insertar — gasto "(Sistema)" en stock inicial
-- ============================================================
DROP FUNCTION IF EXISTS prd_productos_insertar(VARCHAR, INT, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT);
CREATE OR REPLACE FUNCTION prd_productos_insertar(
    p_nombre VARCHAR, p_id_tipo_producto INT, p_id_unidad_medida INT,
    p_precio_compra NUMERIC, p_precio_venta NUMERIC, p_porcentaje_ganancia NUMERIC,
    p_stock_inicial NUMERIC, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT; v_mov_id INT; v_monto_gasto NUMERIC;
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
            p_id_usuario, p_id_usuario)
        RETURNING id INTO v_mov_id;

        v_monto_gasto := ROUND(p_stock_inicial * p_precio_compra, 2);
        IF v_monto_gasto > 0 THEN
            INSERT INTO gst_gastos (monto, concepto, fecha_gasto,
                id_usuario_creacion, id_usuario_modificacion)
            VALUES (v_monto_gasto,
                'Compra: ' || p_nombre || ' (Sistema)',
                (NOW() AT TIME ZONE 'America/Lima')::DATE,
                p_id_usuario, p_id_usuario);
        END IF;
    END IF;
    RETURN v_id;
END; $$;

-- ============================================================
-- 4. prd_ingreso_revertir — al anular, borra el gasto (Sistema)
--    que coincida con producto + monto + fecha del movimiento.
--    Si hay varios ingresos idénticos, se elimina el más antiguo.
-- ============================================================
CREATE OR REPLACE FUNCTION prd_ingreso_revertir(p_id_movimiento INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_tipo        INT;
    v_id_producto INT;
    v_cantidad    NUMERIC;
    v_precio      NUMERIC;
    v_fecha       DATE;
    v_nombre      VARCHAR;
    v_stock       NUMERIC;
    v_monto       NUMERIC;
    v_gasto_id    INT;
BEGIN
    SELECT tipo_movimiento, id_producto, cantidad, precio_unitario, fecha_movimiento::DATE
      INTO v_tipo, v_id_producto, v_cantidad, v_precio, v_fecha
    FROM prd_movimientos WHERE id = p_id_movimiento AND estado = 1;
    IF v_tipo IS NULL THEN
        RAISE EXCEPTION 'Movimiento no encontrado o ya anulado.'; END IF;
    IF v_tipo <> 1 THEN
        RAISE EXCEPTION 'Solo se pueden revertir movimientos de entrada.'; END IF;

    SELECT stock_actual, nombre INTO v_stock, v_nombre
    FROM prd_productos WHERE id = v_id_producto;
    IF v_stock < v_cantidad THEN
        RAISE EXCEPTION 'No se puede anular: el stock actual (%) es menor que la cantidad a revertir (%).', v_stock, v_cantidad;
    END IF;

    UPDATE prd_productos
    SET stock_actual = stock_actual - v_cantidad,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = v_id_producto;

    -- Borrar el gasto automático correspondiente (si existe).
    -- Match: concepto exacto + monto + fecha_gasto. El más antiguo si hay varios.
    v_monto := ROUND(v_cantidad * v_precio, 2);
    SELECT id INTO v_gasto_id
    FROM gst_gastos
    WHERE concepto = ('Compra: ' || v_nombre || ' (Sistema)')
      AND monto = v_monto
      AND fecha_gasto = v_fecha
      AND estado = 1
    ORDER BY id ASC
    LIMIT 1;
    IF v_gasto_id IS NOT NULL THEN
        DELETE FROM gst_gastos WHERE id = v_gasto_id;
    END IF;

    DELETE FROM prd_movimientos WHERE id = p_id_movimiento;
END; $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
