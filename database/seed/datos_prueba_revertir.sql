-- ============================================================
--  REVERSIÓN de los datos generados por `datos_prueba.sql`.
--  Ejecuta este script en el SQL Editor para dejar la BD limpia.
--
--  Elimina EN DURO (no soft delete) los registros SEED:
--    · consumos    con id_trabajador de dni 9900*
--    · movimientos vinculados a productos SEED-*
--    · productos   con nombre SEED-*
--    · trabajadores con dni 9900*
-- ============================================================
SET TIME ZONE 'America/Lima';

BEGIN;

-- 1) Consumos SEED (por trabajador o por producto)
DELETE FROM trb_consumos
WHERE id_trabajador IN (SELECT id FROM trb_trabajadores WHERE dni LIKE '9900%')
   OR id_producto  IN (SELECT id FROM prd_productos    WHERE nombre LIKE 'SEED-%');

-- 2) Movimientos de productos SEED (incluye los creados por consumos)
DELETE FROM prd_movimientos
WHERE id_producto IN (SELECT id FROM prd_productos WHERE nombre LIKE 'SEED-%');

-- 3) Productos SEED
DELETE FROM prd_productos WHERE nombre LIKE 'SEED-%';

-- 4) Trabajadores SEED
DELETE FROM trb_trabajadores WHERE dni LIKE '9900%';

COMMIT;

-- Confirma que quedó limpio
SELECT 'Productos SEED restantes'    AS tipo, COUNT(*) FROM prd_productos   WHERE nombre LIKE 'SEED-%'
UNION ALL SELECT 'Trabajadores SEED restantes', COUNT(*) FROM trb_trabajadores WHERE dni LIKE '9900%'
UNION ALL SELECT 'Movimientos SEED restantes',  COUNT(*) FROM prd_movimientos m
    WHERE m.id_producto IN (SELECT id FROM prd_productos WHERE nombre LIKE 'SEED-%')
UNION ALL SELECT 'Consumos SEED restantes',     COUNT(*) FROM trb_consumos c
    WHERE c.id_trabajador IN (SELECT id FROM trb_trabajadores WHERE dni LIKE '9900%');
