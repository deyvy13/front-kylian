-- ============================================================
--  CONSULTA (SOLO LECTURA) — Por qué el CSV "no cuadra" cuando
--  se calcula precio_compra × stock_total.
--
--  El precio_compra del producto es un promedio ponderado que
--  se ajusta con las VENTAS/consumos entre ingresos. El total
--  gastado real está en prd_movimientos (SUM(cantidad × precio
--  _unitario)), no en el producto.
--
--  Este script lo muestra producto por producto.
-- ============================================================
SET TIME ZONE 'America/Lima';

SELECT
    p.id,
    p.nombre,
    -- lo que muestra el CSV:
    p.precio_compra                                 AS "precio_compra_actual_CSV",
    COALESCE((
        SELECT SUM(m.cantidad) FROM prd_movimientos m
        WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
    ), 0)                                            AS "stock_total_historico_CSV",
    -- lo que da la multiplicación del CSV (aproximación INEXACTA):
    ROUND(p.precio_compra * COALESCE((
        SELECT SUM(m.cantidad) FROM prd_movimientos m
        WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
    ), 0), 2)                                        AS "estimacion_CSV_precio_x_stockTotal",
    -- lo REAL gastado (la misma fórmula que uso al crear los gastos auto):
    ROUND(COALESCE((
        SELECT SUM(m.cantidad * m.precio_unitario) FROM prd_movimientos m
        WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
    ), 0), 2)                                        AS "total_gastado_real_MOVIMIENTOS",
    -- diferencia:
    ROUND(
        p.precio_compra * COALESCE((
            SELECT SUM(m.cantidad) FROM prd_movimientos m
            WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
        ), 0)
      - COALESCE((
            SELECT SUM(m.cantidad * m.precio_unitario) FROM prd_movimientos m
            WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
        ), 0),
    2)                                               AS "diferencia_(sobrestima_del_CSV)"
FROM prd_productos p
WHERE p.estado = 1
ORDER BY ABS(
    p.precio_compra * COALESCE((
        SELECT SUM(m.cantidad) FROM prd_movimientos m
        WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
    ), 0)
  - COALESCE((
        SELECT SUM(m.cantidad * m.precio_unitario) FROM prd_movimientos m
        WHERE m.id_producto = p.id AND m.tipo_movimiento = 1 AND m.estado = 1
    ), 0)
) DESC;
