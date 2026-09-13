-- ============================================================
--  ACTUALIZACIÓN — gst_gastos_suma_total(desde, hasta, texto)
--  Devuelve la suma de monto de TODOS los gastos activos que
--  matchean el filtro (ignorando paginación). Solo lectura.
--  Idempotente.
-- ============================================================
SET TIME ZONE 'America/Lima';

CREATE OR REPLACE FUNCTION gst_gastos_suma_total(
    p_fecha_desde DATE    DEFAULT NULL,
    p_fecha_hasta DATE    DEFAULT NULL,
    p_texto       VARCHAR DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_suma NUMERIC;
BEGIN
    SELECT COALESCE(SUM(monto), 0) INTO v_suma
    FROM gst_gastos
    WHERE estado = 1
      AND (p_fecha_desde IS NULL OR fecha_gasto >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR fecha_gasto <= p_fecha_hasta)
      AND (p_texto       IS NULL OR concepto ILIKE '%'||p_texto||'%');
    RETURN v_suma;
END; $$;

NOTIFY pgrst, 'reload schema';
