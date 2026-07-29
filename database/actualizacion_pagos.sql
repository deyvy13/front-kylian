-- ============================================================
--  ACTUALIZACIÓN — Método de pago en consumos + módulo Pagos
--  - Fixea el 409 en trb_consumos_revertir (orden de DELETE)
--  - Trabajador ya no es obligatorio (solo obligatorio si es crédito)
--  - Consumo lleva método de pago: crédito | efectivo | yape | depósito
--  - Nueva tabla trb_pagos + función para pagar varios consumos juntos
--  Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. Trabajador opcional + método de pago + estado de pago ----
ALTER TABLE trb_consumos ALTER COLUMN id_trabajador DROP NOT NULL;
ALTER TABLE trb_consumos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo';
ALTER TABLE trb_consumos ADD COLUMN IF NOT EXISTS pagado INT NOT NULL DEFAULT 1;

-- ---- 2. Tabla de pagos ----
CREATE TABLE IF NOT EXISTS trb_pagos (
    id                      SERIAL PRIMARY KEY,
    id_trabajador           INT NOT NULL REFERENCES trb_trabajadores(id),
    metodo_pago             VARCHAR(30) NOT NULL,  -- efectivo | yape | deposito | descuento_salario
    monto                   NUMERIC(12,2) NOT NULL,
    fecha_pago              TIMESTAMP NOT NULL DEFAULT NOW(),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
ALTER TABLE trb_pagos DISABLE ROW LEVEL SECURITY;

-- ---- 3. FK id_pago en consumos ----
ALTER TABLE trb_consumos ADD COLUMN IF NOT EXISTS id_pago INT REFERENCES trb_pagos(id);
CREATE INDEX IF NOT EXISTS idx_trb_consumos_pagado ON trb_consumos(pagado) WHERE estado = 1;
CREATE INDEX IF NOT EXISTS idx_trb_consumos_metodo ON trb_consumos(metodo_pago) WHERE estado = 1;

-- ---- 4. Recrear trb_consumos_registrar con método de pago ----
DROP FUNCTION IF EXISTS trb_consumos_registrar(INT, INT, NUMERIC, INT);
CREATE OR REPLACE FUNCTION trb_consumos_registrar(
    p_id_trabajador INT,           -- puede ser NULL
    p_id_producto   INT,
    p_cantidad      NUMERIC,
    p_metodo_pago   VARCHAR,       -- credito | efectivo | yape | deposito
    p_id_usuario    INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_precio NUMERIC; v_stock NUMERIC; v_nombre TEXT;
    v_mov_id INT; v_id INT; v_total NUMERIC;
    v_metodo TEXT := LOWER(TRIM(p_metodo_pago));
    v_es_credito BOOLEAN := (v_metodo = 'credito');
BEGIN
    IF p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
    IF v_metodo NOT IN ('credito','efectivo','yape','deposito') THEN
        RAISE EXCEPTION 'Método de pago inválido.'; END IF;
    IF v_es_credito AND p_id_trabajador IS NULL THEN
        RAISE EXCEPTION 'Para un consumo a crédito debes seleccionar al trabajador.'; END IF;

    SELECT precio_venta, stock_actual INTO v_precio, v_stock
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_precio IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF v_stock < p_cantidad THEN RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock; END IF;

    IF p_id_trabajador IS NOT NULL THEN
        SELECT nombres || ' ' || apellidos INTO v_nombre
        FROM trb_trabajadores WHERE id = p_id_trabajador AND estado = 1;
        IF v_nombre IS NULL THEN RAISE EXCEPTION 'Trabajador no encontrado.'; END IF;
    ELSE
        v_nombre := 'cliente';
    END IF;

    v_total := p_cantidad * v_precio;

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, 2, p_cantidad, v_precio,
        CASE WHEN v_es_credito THEN 'Consumo a crédito: ' || v_nombre
             ELSE 'Consumo (' || v_metodo || '): ' || v_nombre END,
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    UPDATE prd_productos SET stock_actual = stock_actual - p_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id_producto;

    INSERT INTO trb_consumos (id_trabajador, id_producto, cantidad, precio_unitario, total,
        id_movimiento, metodo_pago, pagado,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_trabajador, p_id_producto, p_cantidad, v_precio, v_total,
        v_mov_id, v_metodo,
        CASE WHEN v_es_credito THEN 0 ELSE 1 END,
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ---- 5. Recrear trb_consumos_listar con filtros de método/pendiente ----
DROP FUNCTION IF EXISTS trb_consumos_listar(INT, DATE, DATE);
CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador   INT     DEFAULT NULL,
    p_fecha_desde     DATE    DEFAULT NULL,
    p_fecha_hasta     DATE    DEFAULT NULL,
    p_metodo_pago     VARCHAR DEFAULT NULL,
    p_solo_pendientes INT     DEFAULT NULL  -- 1=solo pendientes, 0=solo pagados, NULL=todos
) RETURNS TABLE (
    id INT, id_trabajador INT, trabajador TEXT, dni VARCHAR,
    id_producto INT, producto VARCHAR, unidad_medida VARCHAR,
    cantidad NUMERIC, precio_unitario NUMERIC, total NUMERIC,
    metodo_pago VARCHAR, pagado INT, id_pago INT,
    fecha_consumo TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.id_trabajador,
           COALESCE((t.nombres || ' ' || t.apellidos), '(sin trabajador)')::TEXT,
           t.dni,
           c.id_producto, p.nombre, um.nombre,
           c.cantidad, c.precio_unitario, c.total,
           c.metodo_pago, c.pagado, c.id_pago,
           c.fecha_consumo
    FROM trb_consumos c
    LEFT JOIN trb_trabajadores t ON t.id = c.id_trabajador
    JOIN prd_productos p ON p.id = c.id_producto
    JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
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

-- ---- 6. Fix trb_consumos_revertir (orden correcto DELETE) ----
CREATE OR REPLACE FUNCTION trb_consumos_revertir(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_cantidad NUMERIC; v_id_producto INT; v_id_mov INT; v_id_pago INT;
BEGIN
    SELECT cantidad, id_producto, id_movimiento, id_pago
      INTO v_cantidad, v_id_producto, v_id_mov, v_id_pago
    FROM trb_consumos WHERE id = p_id;
    IF v_cantidad IS NULL THEN RETURN; END IF;
    IF v_id_pago IS NOT NULL THEN
        RAISE EXCEPTION 'Este consumo ya fue pagado. Elimina primero el pago para poder revertirlo.'; END IF;

    -- Orden: primero consumo (que referencia al movimiento), luego movimiento
    DELETE FROM trb_consumos    WHERE id = p_id;
    IF v_id_mov IS NOT NULL THEN
        DELETE FROM prd_movimientos WHERE id = v_id_mov;
    END IF;
    UPDATE prd_productos SET stock_actual = stock_actual + v_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = v_id_producto;
END; $$;

-- ---- 7. Registrar pago de N consumos ----
CREATE OR REPLACE FUNCTION trb_pagos_registrar(
    p_id_trabajador INT,
    p_metodo_pago   VARCHAR,   -- efectivo | yape | deposito | descuento_salario
    p_ids_consumos  INT[],
    p_id_usuario    INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_id INT; v_total NUMERIC;
    v_metodo TEXT := LOWER(TRIM(p_metodo_pago));
BEGIN
    IF v_metodo NOT IN ('efectivo','yape','deposito','descuento_salario') THEN
        RAISE EXCEPTION 'Método de pago inválido.'; END IF;
    IF array_length(p_ids_consumos, 1) IS NULL THEN
        RAISE EXCEPTION 'Selecciona al menos un consumo.'; END IF;

    SELECT COALESCE(SUM(total), 0) INTO v_total
    FROM trb_consumos
    WHERE id = ANY(p_ids_consumos)
      AND id_trabajador = p_id_trabajador
      AND pagado = 0
      AND estado = 1;
    IF v_total = 0 THEN RAISE EXCEPTION 'No hay deudas válidas en la selección.'; END IF;

    INSERT INTO trb_pagos (id_trabajador, metodo_pago, monto,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_trabajador, v_metodo, v_total, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;

    UPDATE trb_consumos
    SET pagado = 1, id_pago = v_id,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = ANY(p_ids_consumos) AND id_trabajador = p_id_trabajador AND pagado = 0;

    RETURN v_id;
END; $$;

-- ---- 8. Listar deudas activas agrupadas por trabajador ----
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
    WHERE t.estado = 1 AND c.estado = 1
      AND c.pagado = 0 AND c.metodo_pago = 'credito'
    GROUP BY t.id, t.nombres, t.apellidos, t.dni
    HAVING COUNT(c.id) > 0
    ORDER BY total_deuda DESC;
END; $$;

-- ---- 9. Listar pagos (con filtros) ----
CREATE OR REPLACE FUNCTION trb_pagos_listar(
    p_id_trabajador INT  DEFAULT NULL,
    p_fecha_desde   DATE DEFAULT NULL,
    p_fecha_hasta   DATE DEFAULT NULL
) RETURNS TABLE (
    id INT, id_trabajador INT, trabajador TEXT, dni VARCHAR,
    metodo_pago VARCHAR, monto NUMERIC, fecha_pago TIMESTAMP,
    consumos_pagados INT
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.id_trabajador,
           (t.nombres || ' ' || t.apellidos)::TEXT, t.dni,
           p.metodo_pago, p.monto, p.fecha_pago,
           (SELECT COUNT(*)::INT FROM trb_consumos c WHERE c.id_pago = p.id)
    FROM trb_pagos p
    JOIN trb_trabajadores t ON t.id = p.id_trabajador
    WHERE p.estado = 1
      AND (p_id_trabajador IS NULL OR p.id_trabajador = p_id_trabajador)
      AND (p_fecha_desde  IS NULL OR p.fecha_pago::DATE >= p_fecha_desde)
      AND (p_fecha_hasta  IS NULL OR p.fecha_pago::DATE <= p_fecha_hasta)
    ORDER BY p.fecha_pago DESC, p.id DESC;
END; $$;
