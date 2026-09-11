-- ============================================================
--  CONSULTA (SOLO LECTURA) — Comparativa gastos vs compras.
--  No modifica nada. Ejecutar en el SQL Editor de Supabase.
--
--  Compara:
--    · A. Total registrado en gst_gastos (todos los gastos activos,
--         sin filtro de fechas).
--    · B. Total gastado en compras según la lógica automática:
--         SUM(cantidad * precio_unitario) de todos los movimientos
--         tipo 1 (entradas) activos.
--
--  Además desglosa cuánto de A viene del "(Sistema)" (los auto) y
--  cuánto es manual, para saber exactamente qué se está comparando.
-- ============================================================
SET TIME ZONE 'America/Lima';

WITH
gastos_total AS (
    SELECT
        COUNT(*)                     AS registros,
        COALESCE(SUM(monto), 0)      AS monto
    FROM gst_gastos
    WHERE estado = 1
),
gastos_sistema AS (
    SELECT
        COUNT(*)                     AS registros,
        COALESCE(SUM(monto), 0)      AS monto
    FROM gst_gastos
    WHERE estado = 1
      AND concepto LIKE '%(Sistema)'
),
gastos_manuales AS (
    SELECT
        COUNT(*)                     AS registros,
        COALESCE(SUM(monto), 0)      AS monto
    FROM gst_gastos
    WHERE estado = 1
      AND concepto NOT LIKE '%(Sistema)'
),
compras_movimientos AS (
    SELECT
        COUNT(*)                                     AS registros,
        COALESCE(SUM(cantidad * precio_unitario), 0) AS monto
    FROM prd_movimientos
    WHERE tipo_movimiento = 1
      AND estado = 1
)
SELECT '01 — A: Total en gst_gastos (todos, activos)'  AS concepto,
       registros, monto FROM gastos_total
UNION ALL
SELECT '02 —   ↳ desglose: gastos "(Sistema)"'         AS concepto,
       registros, monto FROM gastos_sistema
UNION ALL
SELECT '03 —   ↳ desglose: gastos manuales'            AS concepto,
       registros, monto FROM gastos_manuales
UNION ALL
SELECT '04 — B: Total gastado calculado desde prd_movimientos (entradas activas: SUM(cantidad × precio_unitario))' AS concepto,
       registros, monto FROM compras_movimientos
UNION ALL
SELECT '05 — Diferencia A − B (idealmente = total manual)' AS concepto,
       NULL::BIGINT AS registros,
       ((SELECT monto FROM gastos_total) - (SELECT monto FROM compras_movimientos)) AS monto
UNION ALL
SELECT '06 — Diferencia (Sistema) − B (debería ser 0 si todo está regularizado)' AS concepto,
       NULL::BIGINT AS registros,
       ((SELECT monto FROM gastos_sistema) - (SELECT monto FROM compras_movimientos)) AS monto
ORDER BY concepto;
