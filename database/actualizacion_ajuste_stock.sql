-- ============================================================
--  ACTUALIZACIÓN — Ajuste de stock por conteo físico
--
--  Permite corregir el stock del producto cuando lo digital
--  no coincide con lo físico (típicamente porque se registró
--  de más al ingresar). Registra la diferencia como movimiento
--  con motivo, para que quede auditado.
--
--  Reglas:
--    · Si stock_real < stock_actual → crea movimiento SALIDA
--      con la diferencia. No genera gasto porque no es venta.
--    · Si stock_real > stock_actual → crea movimiento ENTRADA
--      con la diferencia. NO genera gasto porque no es compra.
--      Tampoco recalcula precio_compra por promedio ponderado
--      (es un ajuste, no una compra real).
--    · Si son iguales → no hace nada.
--
--  Idempotente. No modifica tablas.
-- ============================================================
SET TIME ZONE 'America/Lima';

CREATE OR REPLACE FUNCTION prd_stock_ajustar(
    p_id_producto   INT,
    p_stock_real    NUMERIC,   -- cantidad física contada en tienda
    p_motivo        VARCHAR,
    p_id_usuario    INT
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_stock_actual NUMERIC;
    v_precio       NUMERIC;
    v_diff         NUMERIC;
    v_tipo         INT;
    v_cantidad     NUMERIC;
    v_mov_id       INT;
    v_motivo_full  VARCHAR;
BEGIN
    IF p_stock_real < 0 THEN
        RAISE EXCEPTION 'El stock real no puede ser negativo.'; END IF;
    IF LENGTH(TRIM(COALESCE(p_motivo, ''))) = 0 THEN
        RAISE EXCEPTION 'Ingresa el motivo del ajuste.'; END IF;

    SELECT stock_actual, precio_compra INTO v_stock_actual, v_precio
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'Producto no encontrado.'; END IF;

    v_diff := p_stock_real - v_stock_actual;

    IF v_diff = 0 THEN
        RETURN json_build_object(
            'stock_previo', v_stock_actual,
            'stock_nuevo',  p_stock_real,
            'cambio',       0,
            'movimiento_id', NULL
        );
    END IF;

    IF v_diff < 0 THEN
        v_tipo := 2;                -- salida
        v_cantidad := ABS(v_diff);
    ELSE
        v_tipo := 1;                -- entrada
        v_cantidad := v_diff;
    END IF;

    v_motivo_full := 'Ajuste de stock: ' || TRIM(p_motivo);

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, v_tipo, v_cantidad, COALESCE(v_precio, 0),
        v_motivo_full, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    UPDATE prd_productos
    SET stock_actual = p_stock_real,
        id_usuario_modificacion = p_id_usuario,
        fecha_modificacion      = NOW()
    WHERE id = p_id_producto;

    RETURN json_build_object(
        'stock_previo',   v_stock_actual,
        'stock_nuevo',    p_stock_real,
        'cambio',         v_diff,
        'movimiento_id',  v_mov_id
    );
END; $$;

GRANT EXECUTE ON FUNCTION prd_stock_ajustar(INT, NUMERIC, VARCHAR, INT) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
