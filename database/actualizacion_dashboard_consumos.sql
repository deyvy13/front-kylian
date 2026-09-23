-- ============================================================
--  ACTUALIZACIÓN — trb_consumos_dashboard (agregados por rango)
--  Devuelve KPIs, serie diaria y agregado por método en UNA sola
--  query, evitando cortes del max-rows y sin traer registros.
--  Idempotente, solo lectura.
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
        SELECT c.id, c.total, c.cantidad, c.metodo_pago, c.pagado, c.fecha_consumo
        FROM trb_consumos c
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
        SELECT metodo_pago AS metodo, COALESCE(SUM(total), 0) AS valor
        FROM consumos_rango
        GROUP BY metodo_pago
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
