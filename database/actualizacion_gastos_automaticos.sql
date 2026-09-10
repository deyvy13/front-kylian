-- ============================================================
--  ACTUALIZACIÓN — Gastos automáticos por ingreso de stock
--
--  Cada compra de producto (ingreso de stock) genera automáticamente
--  un registro en gst_gastos. NO modifica ninguna tabla — solo
--  reescribe las funciones existentes.
--
--  Contiene:
--  1. prd_stock_ingresar          → ahora inserta gasto auto.
--  2. prd_productos_insertar      → ídem cuando hay stock inicial.
--  3. prd_ingreso_revertir        → al anular un ingreso, borra el
--                                    gasto automático asociado.
--  4. Script de regularización    → crea gastos históricos para
--     los ingresos ya existentes que aún no los tengan.
--
--  Los gastos automáticos se identifican por un sufijo único en el
--  concepto:  " (Mov#<id>)"  — imposible de colisionar con gastos
--  manuales del usuario. Todo el bloque es IDEMPOTENTE — se puede
--  ejecutar más de una vez sin duplicar registros.
--
--  Ejecutar UNA VEZ en el SQL Editor. Si el usuario admin ya tiene
--  otras funciones, este script las reemplaza sin perder datos.
-- ============================================================
SET TIME ZONE 'America/Lima';

BEGIN;

-- ============================================================
-- 1. prd_stock_ingresar — inserta gasto automático al final
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

    -- Promedio ponderado del precio de compra
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

    -- ---- Gasto automático ----
    v_monto_gasto := ROUND(p_cantidad * p_precio_unitario, 2);
    IF v_monto_gasto > 0 THEN
        INSERT INTO gst_gastos (monto, concepto, fecha_gasto,
            id_usuario_creacion, id_usuario_modificacion)
        VALUES (v_monto_gasto,
            'Compra: ' || v_nombre || ' (Mov#' || v_mov_id || ')',
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
-- 2. prd_productos_insertar — gasto automático si hay stock inicial
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
                'Compra: ' || p_nombre || ' (Mov#' || v_mov_id || ')',
                (NOW() AT TIME ZONE 'America/Lima')::DATE,
                p_id_usuario, p_id_usuario);
        END IF;
    END IF;
    RETURN v_id;
END; $$;

-- ============================================================
-- 3. prd_ingreso_revertir — al anular ingreso, borra su gasto auto
-- ============================================================
CREATE OR REPLACE FUNCTION prd_ingreso_revertir(p_id_movimiento INT, p_id_usuario INT)
RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_tipo        INT;
    v_id_producto INT;
    v_cantidad    NUMERIC;
    v_stock       NUMERIC;
    v_marker      TEXT;
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

    -- Borra el gasto automático vinculado (si existe), por el marcador único
    v_marker := '%(Mov#' || p_id_movimiento || ')%';
    DELETE FROM gst_gastos WHERE concepto LIKE v_marker;

    DELETE FROM prd_movimientos WHERE id = p_id_movimiento;
END; $$;

-- ============================================================
-- 4. REGULARIZACIÓN HISTÓRICA — crea gastos para ingresos antiguos
--     que aún no tienen su gasto asociado. Idempotente.
-- ============================================================
DO $$
DECLARE
    v_mov         RECORD;
    v_concepto    VARCHAR;
    v_monto       NUMERIC;
    v_creados     INT := 0;
    v_saltados    INT := 0;
BEGIN
    FOR v_mov IN
        SELECT m.id AS mov_id, m.cantidad, m.precio_unitario,
               m.fecha_movimiento, m.fecha_creacion,
               m.id_usuario_creacion, m.id_usuario_modificacion,
               p.nombre AS producto
        FROM prd_movimientos m
        JOIN prd_productos p ON p.id = m.id_producto
        WHERE m.tipo_movimiento = 1 AND m.estado = 1
        ORDER BY m.id
    LOOP
        v_concepto := 'Compra: ' || v_mov.producto || ' (Mov#' || v_mov.mov_id || ')';
        v_monto := ROUND(v_mov.cantidad * v_mov.precio_unitario, 2);

        IF v_monto <= 0 THEN
            v_saltados := v_saltados + 1;
            CONTINUE;
        END IF;

        -- El marcador " (Mov#123)" hace imposible colisionar con gastos manuales
        IF EXISTS (
            SELECT 1 FROM gst_gastos
            WHERE concepto LIKE '%(Mov#' || v_mov.mov_id || ')%'
        ) THEN
            v_saltados := v_saltados + 1;
            CONTINUE;
        END IF;

        INSERT INTO gst_gastos (monto, concepto, fecha_gasto, estado,
            id_usuario_creacion, id_usuario_modificacion,
            fecha_creacion, fecha_modificacion)
        VALUES (v_monto, v_concepto, v_mov.fecha_movimiento::DATE, 1,
            COALESCE(v_mov.id_usuario_creacion, 1),
            COALESCE(v_mov.id_usuario_modificacion, 1),
            v_mov.fecha_creacion, v_mov.fecha_creacion);

        v_creados := v_creados + 1;
    END LOOP;

    RAISE NOTICE 'Regularización completada: % gasto(s) creado(s), % saltado(s) (ya existían o monto 0).', v_creados, v_saltados;
END $$;

COMMIT;
NOTIFY pgrst, 'reload schema';
