-- ============================================================
--  ACTUALIZACIÓN — trb_consumos_dashboard usa pago_metodo real
--  en el agregado por_metodo. Los créditos ya pagados ya no se
--  reportan como "credito" sino con el método con el que se
--  saldaron (desde trb_pagos). Idempotente.
-- ============================================================
SET TIME ZONE 'America/Lima';

CREATE OR REPLACE FUNCTION trb_consumos_dashboard(
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_desde  DATE := COALESCE(p_fecha_desde, (NOW() AT TIME ZONE 'America/Lima')::DATE - INTERVAL '30 days');
    v_hasta  DATE := COALESCE(p_fecha_hasta, (NOW() AT TIME ZONE 'America/Lima')::DATE);
    v_result JSON;
BEGIN
    WITH
    consumos_rango AS (
        SELECT c.id, c.total, c.cantidad, c.metodo_pago, c.pagado,
               c.id_pago, c.fecha_consumo,
               -- método efectivo: si es crédito ya pagado, el método del pago;
               -- si está pendiente, 'credito'; si no es crédito, su propio método.
               CASE
                   WHEN c.metodo_pago = 'credito' AND c.pagado = 1 AND pg.metodo_pago IS NOT NULL
                        THEN pg.metodo_pago
                   ELSE c.metodo_pago
               END AS metodo_efectivo
        FROM trb_consumos c
        LEFT JOIN trb_pagos pg ON pg.id = c.id_pago
        WHERE c.estado = 1
          AND c.fecha_consumo::DATE BETWEEN v_desde AND v_hasta
    ),
    kpis AS (
        SELECT
            COUNT(*)::BIGINT                                     AS registros,
            COALESCE(SUM(cantidad), 0)                           AS cantidad,
            COALESCE(SUM(total), 0)                              AS valor,
            COALESCE(SUM(CASE
                WHEN metodo_pago = 'credito' AND pagado = 0
                THEN total ELSE 0 END), 0)                       AS deuda
        FROM consumos_rango
    ),
    serie AS (
        SELECT d::DATE AS fecha,
               COALESCE(SUM(cr.total), 0)                              AS total,
               COALESCE(SUM(CASE WHEN cr.metodo_pago = 'credito'
                                 THEN cr.total ELSE 0 END), 0)         AS credito
        FROM generate_series(v_desde, v_hasta, INTERVAL '1 day') d
        LEFT JOIN consumos_rango cr ON cr.fecha_consumo::DATE = d::DATE
        GROUP BY d
        ORDER BY d
    ),
    por_metodo AS (
        SELECT metodo_efectivo AS metodo, COALESCE(SUM(total), 0) AS valor
        FROM consumos_rango
        GROUP BY metodo_efectivo
    )
    SELECT json_build_object(
        'rango',     json_build_object('desde', v_desde, 'hasta', v_hasta),
        'kpis',      (SELECT row_to_json(k) FROM kpis k),
        'serie',     (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM serie s),
        'por_metodo',(SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json) FROM por_metodo m)
    ) INTO v_result;
    RETURN v_result;
END; $$;

NOTIFY pgrst, 'reload schema';
