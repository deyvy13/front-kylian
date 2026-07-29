-- ============================================================
-- Seed: listas maestras iniciales
-- ============================================================

-- Lista: Tipos de producto
INSERT INTO gen_lista (nombre, descripcion, id_usuario_creacion, id_usuario_modificacion)
SELECT 'TIPOS_PRODUCTO', 'Tipos de producto de la bodega', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM gen_lista WHERE nombre = 'TIPOS_PRODUCTO');

-- Lista: Unidades de medida
INSERT INTO gen_lista (nombre, descripcion, id_usuario_creacion, id_usuario_modificacion)
SELECT 'UNIDADES_MEDIDA', 'Unidades de medida para productos', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM gen_lista WHERE nombre = 'UNIDADES_MEDIDA');

-- Opciones: Tipos de producto (bodega peruana)
WITH lista AS (SELECT id FROM gen_lista WHERE nombre = 'TIPOS_PRODUCTO')
INSERT INTO gen_lista_opciones (id_lista, nombre, id_usuario_creacion, id_usuario_modificacion)
SELECT lista.id, tipo, 1, 1
FROM lista, (VALUES
    ('Abarrotes'),
    ('Bebidas'),
    ('Snacks y golosinas'),
    ('Lácteos y huevos'),
    ('Panadería'),
    ('Embutidos'),
    ('Frutas y verduras'),
    ('Condimentos y especias'),
    ('Limpieza del hogar'),
    ('Higiene personal'),
    ('Licores'),
    ('Congelados'),
    ('Enlatados y conservas'),
    ('Menaje y descartables')
) AS t(tipo)
WHERE NOT EXISTS (
    SELECT 1 FROM gen_lista_opciones o WHERE o.id_lista = lista.id AND o.nombre = t.tipo
);

-- Opciones: Unidades de medida
WITH lista AS (SELECT id FROM gen_lista WHERE nombre = 'UNIDADES_MEDIDA')
INSERT INTO gen_lista_opciones (id_lista, nombre, id_usuario_creacion, id_usuario_modificacion)
SELECT lista.id, u, 1, 1
FROM lista, (VALUES
    ('Unidad'),
    ('Kilogramo'),
    ('Gramo'),
    ('Litro'),
    ('Mililitro'),
    ('Paquete'),
    ('Bolsa'),
    ('Docena'),
    ('Caja'),
    ('Botella')
) AS t(u)
WHERE NOT EXISTS (
    SELECT 1 FROM gen_lista_opciones o WHERE o.id_lista = lista.id AND o.nombre = t.u
);
