-- ============================================================
--  ACTUALIZACIÓN — Módulo Gastos + Dashboard financiero
--
--  1. Tabla gst_gastos (prefijo gst = gastos).
--  2. CRUD: gst_gastos_listar / _crear / _actualizar / _eliminar.
--  3. gst_dashboard_finanzas: ingresos, egresos, deudas y series
--     por día para el rango filtrado.
--
--  Ejecutar UNA VEZ en el SQL Editor.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- 1. Tabla ----
CREATE TABLE IF NOT EXISTS gst_gastos (
    id                      SERIAL PRIMARY KEY,
    monto                   NUMERIC(12,2) NOT NULL,
    concepto                VARCHAR(255) NOT NULL,
    fecha_gasto             DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Lima')::DATE,
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
ALTER TABLE gst_gastos DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gst_gastos_fecha ON gst_gastos(fecha_gasto) WHERE estado = 1;

-- ---- 2. CRUD ----
CREATE OR REPLACE FUNCTION gst_gastos_listar(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL,
    p_texto       VARCHAR DEFAULT NULL
)
RETURNS TABLE (id INT, monto NUMERIC, concepto VARCHAR, fecha_gasto DATE, fecha_creacion TIMESTAMP)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.monto, g.concepto, g.fecha_gasto, g.fecha_creacion
    FROM gst_gastos g
    WHERE g.estado = 1
      AND (p_fecha_desde IS NULL OR g.fecha_gasto >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR g.fecha_gasto <= p_fecha_hasta)
      AND (p_texto IS NULL OR g.concepto ILIKE '%'||p_texto||'%')
    ORDER BY g.fecha_gasto DESC, g.id DESC;
END; $$;

CREATE OR REPLACE FUNCTION gst_gastos_crear(
    p_monto NUMERIC, p_concepto VARCHAR, p_fecha_gasto DATE, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a cero.'; END IF;
    IF LENGTH(TRIM(COALESCE(p_concepto,''))) = 0 THEN RAISE EXCEPTION 'Ingresa el concepto del gasto.'; END IF;
    INSERT INTO gst_gastos (monto, concepto, fecha_gasto,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_monto, p_concepto,
        COALESCE(p_fecha_gasto, (NOW() AT TIME ZONE 'America/Lima')::DATE),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION gst_gastos_actualizar(
    p_id INT, p_monto NUMERIC, p_concepto VARCHAR, p_fecha_gasto DATE, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a cero.'; END IF;
    IF LENGTH(TRIM(COALESCE(p_concepto,''))) = 0 THEN RAISE EXCEPTION 'Ingresa el concepto del gasto.'; END IF;
    UPDATE gst_gastos
    SET monto = p_monto, concepto = p_concepto, fecha_gasto = p_fecha_gasto,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

CREATE OR REPLACE FUNCTION gst_gastos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE gst_gastos SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

-- ---- 3. Dashboard financiero ----
--   Ingresos reales = consumos NO crédito (efectivo/yape/depósito) del rango
--                     + pagos de créditos registrados en el rango
--   Egresos         = suma de gastos del rango
--   Deudas nuevas   = consumos a crédito registrados en el rango (sea que estén
--                     pagados o no; refleja la deuda que se GENERÓ en el período)
--   Deuda activa    = suma actual de créditos sin pagar (global, no depende del rango)
CREATE OR REPLACE FUNCTION gst_dashboard_finanzas(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_desde DATE := COALESCE(p_fecha_desde, (NOW() AT TIME ZONE 'America/Lima')::DATE - INTERVAL '30 days');
    v_hasta DATE := COALESCE(p_fecha_hasta, (NOW() AT TIME ZONE 'America/Lima')::DATE);
    v_result JSON;
BEGIN
    WITH
    ingresos_contado AS (
        SELECT c.fecha_consumo::DATE AS fecha, SUM(c.total) AS monto
        FROM trb_consumos c
        WHERE c.estado = 1 AND c.metodo_pago <> 'credito'
          AND c.fecha_consumo::DATE BETWEEN v_desde AND v_hasta
        GROUP BY c.fecha_consumo::DATE
    ),
    ingresos_pagos AS (
        SELECT p.fecha_pago::DATE AS fecha, SUM(p.monto) AS monto
        FROM trb_pagos p
        WHERE p.estado = 1
          AND p.fecha_pago::DATE BETWEEN v_desde AND v_hasta
        GROUP BY p.fecha_pago::DATE
    ),
    egresos AS (
        SELECT g.fecha_gasto AS fecha, SUM(g.monto) AS monto
        FROM gst_gastos g
        WHERE g.estado = 1
          AND g.fecha_gasto BETWEEN v_desde AND v_hasta
        GROUP BY g.fecha_gasto
    ),
    deudas AS (
        SELECT c.fecha_consumo::DATE AS fecha, SUM(c.total) AS monto
        FROM trb_consumos c
        WHERE c.estado = 1 AND c.metodo_pago = 'credito'
          AND c.fecha_consumo::DATE BETWEEN v_desde AND v_hasta
        GROUP BY c.fecha_consumo::DATE
    ),
    serie AS (
        SELECT d::DATE AS fecha,
            COALESCE(ic.monto,0) + COALESCE(ip.monto,0) AS ingresos,
            COALESCE(e.monto,0)                          AS egresos,
            COALESCE(de.monto,0)                         AS deudas
        FROM generate_series(v_desde, v_hasta, INTERVAL '1 day') d
        LEFT JOIN ingresos_contado ic ON ic.fecha = d::DATE
        LEFT JOIN ingresos_pagos   ip ON ip.fecha = d::DATE
        LEFT JOIN egresos          e  ON e.fecha  = d::DATE
        LEFT JOIN deudas           de ON de.fecha = d::DATE
        ORDER BY d
    ),
    kpis AS (
        SELECT
            (SELECT COALESCE(SUM(ingresos),0) FROM serie) AS ingresos,
            (SELECT COALESCE(SUM(egresos),0)  FROM serie) AS egresos,
            (SELECT COALESCE(SUM(deudas),0)   FROM serie) AS deudas_nuevas,
            (SELECT COALESCE(SUM(total),0)
             FROM trb_consumos
             WHERE estado = 1 AND metodo_pago = 'credito' AND pagado = 0
            ) AS deuda_activa_total
    )
    SELECT json_build_object(
        'rango',  json_build_object('desde', v_desde, 'hasta', v_hasta),
        'kpis',   (SELECT row_to_json(k) FROM kpis k),
        'serie',  (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM serie s)
    ) INTO v_result;
    RETURN v_result;
END; $$;

NOTIFY pgrst, 'reload schema';
