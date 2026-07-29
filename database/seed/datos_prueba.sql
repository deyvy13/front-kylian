-- ============================================================
--  DATOS DE PRUEBA — 10 registros por módulo
--  Marcadores para poder revertir después:
--    · productos    → nombre empieza con "SEED-"
--    · trabajadores → dni empieza con "9900"
--    · movimientos y consumos: se identifican por sus FKs
--
--  Para revertir estos datos: ejecuta `datos_prueba_revertir.sql`
-- ============================================================
SET TIME ZONE 'America/Lima';

DO $$
DECLARE
    v_tipo_abarrotes INT;
    v_tipo_bebidas   INT;
    v_tipo_snacks    INT;
    v_tipo_limpieza  INT;
    v_un_unidad      INT;
    v_un_kg          INT;
    v_un_litro       INT;
    v_un_paquete     INT;
BEGIN
    -- Referencias a listas maestras (deben existir por el seed inicial)
    SELECT id INTO v_tipo_abarrotes FROM gen_lista_opciones WHERE nombre = 'Abarrotes' LIMIT 1;
    SELECT id INTO v_tipo_bebidas   FROM gen_lista_opciones WHERE nombre = 'Bebidas' LIMIT 1;
    SELECT id INTO v_tipo_snacks    FROM gen_lista_opciones WHERE nombre = 'Snacks y golosinas' LIMIT 1;
    SELECT id INTO v_tipo_limpieza  FROM gen_lista_opciones WHERE nombre = 'Limpieza del hogar' LIMIT 1;
    SELECT id INTO v_un_unidad      FROM gen_lista_opciones WHERE nombre = 'Unidad' LIMIT 1;
    SELECT id INTO v_un_kg          FROM gen_lista_opciones WHERE nombre = 'Kilogramo' LIMIT 1;
    SELECT id INTO v_un_litro       FROM gen_lista_opciones WHERE nombre = 'Litro' LIMIT 1;
    SELECT id INTO v_un_paquete     FROM gen_lista_opciones WHERE nombre = 'Paquete' LIMIT 1;

    -- ============================================================
    -- 1) 10 PRODUCTOS
    -- ============================================================
    INSERT INTO prd_productos (nombre, id_tipo_producto, id_unidad_medida,
        precio_compra, precio_venta, porcentaje_ganancia, stock_actual,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES
      ('SEED-Arroz Costeño 5kg',       v_tipo_abarrotes, v_un_unidad,  22.00, 26.00, 18.18, 30, 1, 1),
      ('SEED-Aceite Primor 1L',        v_tipo_abarrotes, v_un_litro,    9.50, 12.00, 26.31, 20, 1, 1),
      ('SEED-Azúcar Rubia 1kg',        v_tipo_abarrotes, v_un_kg,       4.00,  5.00, 25.00, 50, 1, 1),
      ('SEED-Fideos Don Vittorio',     v_tipo_abarrotes, v_un_paquete,  3.20,  4.00, 25.00, 40, 1, 1),
      ('SEED-Leche Gloria 400g',       v_tipo_abarrotes, v_un_unidad,   3.80,  4.50, 18.42, 60, 1, 1),
      ('SEED-Inca Kola 1.5L',          v_tipo_bebidas,   v_un_unidad,   5.20,  7.00, 34.61, 35, 1, 1),
      ('SEED-Coca Cola 1L',            v_tipo_bebidas,   v_un_unidad,   4.50,  6.00, 33.33, 25, 1, 1),
      ('SEED-Papitas Lays 45g',        v_tipo_snacks,    v_un_unidad,   1.80,  2.50, 38.88, 80, 1, 1),
      ('SEED-Chocolate Sublime',       v_tipo_snacks,    v_un_unidad,   1.50,  2.00, 33.33, 100, 1, 1),
      ('SEED-Ace Detergente 780g',     v_tipo_limpieza,  v_un_unidad,   8.20, 10.50, 28.04, 18, 1, 1);

    -- ============================================================
    -- 2) 10 TRABAJADORES (DNIs 99000001 .. 99000010)
    -- ============================================================
    INSERT INTO trb_trabajadores (nombres, apellidos, dni, labor,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES
      ('Juan Carlos',   'Pérez Ramos',       '99000001', 'Cajera',   1, 1),
      ('María Elena',   'García Torres',     '99000002', 'Almacén',  1, 1),
      ('Luis Alberto',  'Ramírez Silva',     '99000003', 'Reparto',  1, 1),
      ('Rosa María',    'Fernández López',   '99000004', 'Cajera',   1, 1),
      ('Carlos Andrés', 'Mendoza Vega',      '99000005', 'Almacén',  1, 1),
      ('Ana Lucía',     'Rojas Salazar',     '99000006', 'Limpieza', 1, 1),
      ('Miguel Ángel',  'Torres Chávez',     '99000007', 'Reparto',  1, 1),
      ('Carmen Julia',  'Vargas Ortiz',      '99000008', 'Cajera',   1, 1),
      ('Diego Fernando','Castillo Herrera',  '99000009', 'Almacén',  1, 1),
      ('Patricia',      'Núñez Delgado',     '99000010', 'Cajera',   1, 1);

    -- ============================================================
    -- 3) 10 MOVIMIENTOS (5 entradas + 5 salidas) sobre SEED-productos
    --    Nota: NO tocan el stock_actual porque estos datos son solo
    --    para historial de prueba. Si quieres que también afecten
    --    stock, hazlo desde la UI usando el modal de movimiento.
    -- ============================================================
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 1, 20, p.precio_compra, 'SEED - Compra a proveedor',
           NOW() - INTERVAL '10 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Arroz Costeño 5kg';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 1, 15, p.precio_compra, 'SEED - Reposición mensual',
           NOW() - INTERVAL '9 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Aceite Primor 1L';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 1, 50, p.precio_compra, 'SEED - Compra semanal',
           NOW() - INTERVAL '8 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Azúcar Rubia 1kg';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 1, 40, p.precio_compra, 'SEED - Reposición',
           NOW() - INTERVAL '7 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Fideos Don Vittorio';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 1, 60, p.precio_compra, 'SEED - Compra semanal',
           NOW() - INTERVAL '6 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Leche Gloria 400g';

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 2, 5, p.precio_venta, 'SEED - Venta al mostrador',
           NOW() - INTERVAL '5 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Inca Kola 1.5L';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 2, 3, p.precio_venta, 'SEED - Venta al mostrador',
           NOW() - INTERVAL '4 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Coca Cola 1L';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 2, 10, p.precio_venta, 'SEED - Venta al mostrador',
           NOW() - INTERVAL '3 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Papitas Lays 45g';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 2, 15, p.precio_venta, 'SEED - Venta al mostrador',
           NOW() - INTERVAL '2 days', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Chocolate Sublime';
    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, fecha_movimiento, id_usuario_creacion, id_usuario_modificacion)
    SELECT p.id, 2, 2, p.precio_venta, 'SEED - Venta al mostrador',
           NOW() - INTERVAL '1 day', 1, 1
    FROM prd_productos p WHERE p.nombre = 'SEED-Ace Detergente 780g';

    -- ============================================================
    -- 4) 10 CONSUMOS DE TRABAJADORES (usan trb_consumos_registrar,
    --    que además crea un movimiento de salida y descuenta stock)
    --    Firma: (id_trabajador, id_producto, cantidad, metodo_pago, id_usuario)
    --    Mezcla de métodos: efectivo, yape, deposito y credito.
    -- ============================================================
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000001'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Inca Kola 1.5L'),
        1, 'efectivo', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000002'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Papitas Lays 45g'),
        2, 'credito', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000003'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Chocolate Sublime'),
        3, 'yape', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000004'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Coca Cola 1L'),
        1, 'credito', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000005'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Leche Gloria 400g'),
        2, 'deposito', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000006'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Chocolate Sublime'),
        1, 'credito', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000007'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Papitas Lays 45g'),
        1, 'efectivo', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000008'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Inca Kola 1.5L'),
        2, 'credito', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000009'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Fideos Don Vittorio'),
        1, 'yape', 1);
    PERFORM trb_consumos_registrar(
        (SELECT id FROM trb_trabajadores WHERE dni = '99000010'),
        (SELECT id FROM prd_productos    WHERE nombre = 'SEED-Azúcar Rubia 1kg'),
        2, 'credito', 1);
END $$;

-- Muestra qué se creó
SELECT 'Productos SEED'    AS tipo, COUNT(*) AS total FROM prd_productos   WHERE nombre LIKE 'SEED-%'
UNION ALL SELECT 'Trabajadores SEED', COUNT(*)          FROM trb_trabajadores WHERE dni LIKE '9900%'
UNION ALL SELECT 'Movimientos SEED',  COUNT(*)          FROM prd_movimientos m
    WHERE m.id_producto IN (SELECT id FROM prd_productos WHERE nombre LIKE 'SEED-%')
UNION ALL SELECT 'Consumos SEED',     COUNT(*)          FROM trb_consumos c
    WHERE c.id_trabajador IN (SELECT id FROM trb_trabajadores WHERE dni LIKE '9900%');
