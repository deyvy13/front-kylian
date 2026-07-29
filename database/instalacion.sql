-- ============================================================
--  KYLIAN JOSÉ — Script de instalación completo
--  Ejecutar de un solo golpe en el SQL Editor de Supabase.
--  Zona horaria: America/Lima (Perú).
-- ============================================================

-- ============================================================
-- 0. CONFIG
-- ============================================================
ALTER DATABASE postgres SET timezone TO 'America/Lima';
SET TIME ZONE 'America/Lima';

-- Necesaria para hashear contraseñas (crypt / gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. SCHEMA
-- ============================================================

-- ---- auth_usuarios ----
CREATE TABLE IF NOT EXISTS auth_usuarios (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(150) NOT NULL,
    correo                  VARCHAR(150) UNIQUE NOT NULL,
    password_hash           TEXT,
    auth_uid                UUID,
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
-- por si la tabla ya existía sin la columna:
ALTER TABLE auth_usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

INSERT INTO auth_usuarios (id, nombre, correo, id_usuario_creacion, id_usuario_modificacion)
VALUES (1, 'Administrador', 'admin@kylianjose.local', 1, 1)
ON CONFLICT (id) DO NOTHING;
SELECT setval('auth_usuarios_id_seq', GREATEST((SELECT MAX(id) FROM auth_usuarios), 1));

-- ---- gen_lista ----
CREATE TABLE IF NOT EXISTS gen_lista (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(100) NOT NULL,
    descripcion             VARCHAR(255),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gen_lista_opciones (
    id                      SERIAL PRIMARY KEY,
    id_lista                INT NOT NULL REFERENCES gen_lista(id),
    nombre                  VARCHAR(150) NOT NULL,
    descripcion             VARCHAR(255),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gen_lista_opciones_lista ON gen_lista_opciones(id_lista) WHERE estado = 1;

-- ---- prd_productos ----
CREATE TABLE IF NOT EXISTS prd_productos (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(200) NOT NULL,
    id_tipo_producto        INT NOT NULL REFERENCES gen_lista_opciones(id),
    id_unidad_medida        INT NOT NULL REFERENCES gen_lista_opciones(id),
    precio_compra           NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_venta            NUMERIC(12,2) NOT NULL DEFAULT 0,
    porcentaje_ganancia     NUMERIC(8,2)  NOT NULL DEFAULT 0,
    stock_actual            NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prd_productos_tipo ON prd_productos(id_tipo_producto) WHERE estado = 1;

-- ---- prd_movimientos ----
CREATE TABLE IF NOT EXISTS prd_movimientos (
    id                      SERIAL PRIMARY KEY,
    id_producto             INT NOT NULL REFERENCES prd_productos(id),
    tipo_movimiento         INT NOT NULL CHECK (tipo_movimiento IN (1, 2)),
    cantidad                NUMERIC(12,2) NOT NULL,
    precio_unitario         NUMERIC(12,2) NOT NULL DEFAULT 0,
    motivo                  VARCHAR(255),
    fecha_movimiento        TIMESTAMP NOT NULL DEFAULT NOW(),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prd_movimientos_prod  ON prd_movimientos(id_producto) WHERE estado = 1;
CREATE INDEX IF NOT EXISTS idx_prd_movimientos_fecha ON prd_movimientos(fecha_movimiento) WHERE estado = 1;

-- ---- trb_trabajadores / trb_consumos ----
CREATE TABLE IF NOT EXISTS trb_trabajadores (
    id                      SERIAL PRIMARY KEY,
    nombres                 VARCHAR(150) NOT NULL,
    apellidos               VARCHAR(150) NOT NULL,
    dni                     VARCHAR(15) UNIQUE NOT NULL,
    labor                   VARCHAR(150),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trb_consumos (
    id                      SERIAL PRIMARY KEY,
    id_trabajador           INT NOT NULL REFERENCES trb_trabajadores(id),
    id_producto             INT NOT NULL REFERENCES prd_productos(id),
    cantidad                NUMERIC(12,2) NOT NULL,
    precio_unitario         NUMERIC(12,2) NOT NULL,
    total                   NUMERIC(12,2) NOT NULL,
    fecha_consumo           TIMESTAMP NOT NULL DEFAULT NOW(),
    id_movimiento           INT REFERENCES prd_movimientos(id),
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trb_consumos_trab  ON trb_consumos(id_trabajador) WHERE estado = 1;
CREATE INDEX IF NOT EXISTS idx_trb_consumos_fecha ON trb_consumos(fecha_consumo)  WHERE estado = 1;

-- ============================================================
-- 1b. RLS OFF — este sistema aún no tiene login real; el acceso
--     al Postgres está protegido por la anon key + funciones.
-- ============================================================
ALTER TABLE auth_usuarios      DISABLE ROW LEVEL SECURITY;
ALTER TABLE gen_lista          DISABLE ROW LEVEL SECURITY;
ALTER TABLE gen_lista_opciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE prd_productos      DISABLE ROW LEVEL SECURITY;
ALTER TABLE prd_movimientos    DISABLE ROW LEVEL SECURITY;
ALTER TABLE trb_trabajadores   DISABLE ROW LEVEL SECURITY;
ALTER TABLE trb_consumos       DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. SEED — listas maestras
-- ============================================================
INSERT INTO gen_lista (nombre, descripcion, id_usuario_creacion, id_usuario_modificacion)
SELECT 'TIPOS_PRODUCTO', 'Tipos de producto de la bodega', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM gen_lista WHERE nombre = 'TIPOS_PRODUCTO');

INSERT INTO gen_lista (nombre, descripcion, id_usuario_creacion, id_usuario_modificacion)
SELECT 'UNIDADES_MEDIDA', 'Unidades de medida para productos', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM gen_lista WHERE nombre = 'UNIDADES_MEDIDA');

WITH lista AS (SELECT id FROM gen_lista WHERE nombre = 'TIPOS_PRODUCTO')
INSERT INTO gen_lista_opciones (id_lista, nombre, id_usuario_creacion, id_usuario_modificacion)
SELECT lista.id, tipo, 1, 1
FROM lista, (VALUES
    ('Abarrotes'), ('Bebidas'), ('Snacks y golosinas'), ('Lácteos y huevos'),
    ('Panadería'), ('Embutidos'), ('Frutas y verduras'), ('Condimentos y especias'),
    ('Limpieza del hogar'), ('Higiene personal'), ('Licores'), ('Congelados'),
    ('Enlatados y conservas'), ('Menaje y descartables')
) AS t(tipo)
WHERE NOT EXISTS (
    SELECT 1 FROM gen_lista_opciones o WHERE o.id_lista = lista.id AND o.nombre = t.tipo
);

WITH lista AS (SELECT id FROM gen_lista WHERE nombre = 'UNIDADES_MEDIDA')
INSERT INTO gen_lista_opciones (id_lista, nombre, id_usuario_creacion, id_usuario_modificacion)
SELECT lista.id, u, 1, 1
FROM lista, (VALUES
    ('Unidad'), ('Kilogramo'), ('Gramo'), ('Litro'), ('Mililitro'),
    ('Paquete'), ('Bolsa'), ('Docena'), ('Caja'), ('Botella')
) AS t(u)
WHERE NOT EXISTS (
    SELECT 1 FROM gen_lista_opciones o WHERE o.id_lista = lista.id AND o.nombre = t.u
);

-- ============================================================
-- 3. FUNCIONES
-- ============================================================

-- ---- gen_lista_opciones_listar ----
CREATE OR REPLACE FUNCTION gen_lista_opciones_listar(p_lista_nombre VARCHAR)
RETURNS TABLE (id INT, nombre VARCHAR, descripcion VARCHAR)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.nombre, o.descripcion
    FROM gen_lista_opciones o
    JOIN gen_lista l ON l.id = o.id_lista
    WHERE l.nombre = p_lista_nombre AND o.estado = 1 AND l.estado = 1
    ORDER BY o.nombre;
END; $$;

-- ---- prd_productos_listar ----
CREATE OR REPLACE FUNCTION prd_productos_listar(
    p_id_tipo_producto INT     DEFAULT NULL,
    p_fecha_desde      DATE    DEFAULT NULL,
    p_fecha_hasta      DATE    DEFAULT NULL,
    p_texto            VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id INT, nombre VARCHAR, id_tipo_producto INT, tipo_producto VARCHAR,
    id_unidad_medida INT, unidad_medida VARCHAR,
    precio_compra NUMERIC, precio_venta NUMERIC, porcentaje_ganancia NUMERIC,
    ganancia_unitaria NUMERIC, stock_actual NUMERIC, fecha_creacion TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nombre, p.id_tipo_producto, tp.nombre, p.id_unidad_medida, um.nombre,
           p.precio_compra, p.precio_venta, p.porcentaje_ganancia,
           (p.precio_venta - p.precio_compra), p.stock_actual, p.fecha_creacion
    FROM prd_productos p
    JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
    JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE p.estado = 1
      AND (p_id_tipo_producto IS NULL OR p.id_tipo_producto = p_id_tipo_producto)
      AND (p_fecha_desde IS NULL OR p.fecha_creacion::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR p.fecha_creacion::DATE <= p_fecha_hasta)
      AND (p_texto IS NULL OR p.nombre ILIKE '%' || p_texto || '%')
    ORDER BY p.fecha_creacion DESC, p.id DESC;
END; $$;

-- ---- prd_productos_insertar ----
CREATE OR REPLACE FUNCTION prd_productos_insertar(
    p_nombre VARCHAR, p_id_tipo_producto INT, p_id_unidad_medida INT,
    p_precio_compra NUMERIC, p_precio_venta NUMERIC, p_porcentaje_ganancia NUMERIC,
    p_stock_inicial NUMERIC, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    INSERT INTO prd_productos (nombre, id_tipo_producto, id_unidad_medida,
        precio_compra, precio_venta, porcentaje_ganancia, stock_actual,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombre, p_id_tipo_producto, p_id_unidad_medida,
        p_precio_compra, p_precio_venta, p_porcentaje_ganancia, COALESCE(p_stock_inicial,0),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;

    IF COALESCE(p_stock_inicial, 0) > 0 THEN
        INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
            motivo, id_usuario_creacion, id_usuario_modificacion)
        VALUES (v_id, 1, p_stock_inicial, p_precio_compra, 'Stock inicial',
            p_id_usuario, p_id_usuario);
    END IF;
    RETURN v_id;
END; $$;

-- ---- prd_productos_actualizar ----
CREATE OR REPLACE FUNCTION prd_productos_actualizar(
    p_id INT, p_nombre VARCHAR, p_id_tipo_producto INT, p_id_unidad_medida INT,
    p_precio_compra NUMERIC, p_precio_venta NUMERIC, p_porcentaje_ganancia NUMERIC,
    p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE prd_productos
    SET nombre = p_nombre, id_tipo_producto = p_id_tipo_producto,
        id_unidad_medida = p_id_unidad_medida, precio_compra = p_precio_compra,
        precio_venta = p_precio_venta, porcentaje_ganancia = p_porcentaje_ganancia,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

-- ---- prd_productos_eliminar (soft) ----
CREATE OR REPLACE FUNCTION prd_productos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE prd_productos
    SET estado = 0, id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

-- ---- prd_movimientos_registrar ----
CREATE OR REPLACE FUNCTION prd_movimientos_registrar(
    p_id_producto INT, p_tipo_movimiento INT, p_cantidad NUMERIC,
    p_precio_unitario NUMERIC, p_motivo VARCHAR, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT; v_stock NUMERIC;
BEGIN
    IF p_tipo_movimiento NOT IN (1, 2) THEN
        RAISE EXCEPTION 'Tipo de movimiento inválido (1=entrada, 2=salida).'; END IF;
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
    SELECT stock_actual INTO v_stock FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF p_tipo_movimiento = 2 AND v_stock < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock; END IF;

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, p_tipo_movimiento, p_cantidad, COALESCE(p_precio_unitario,0),
        p_motivo, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;

    UPDATE prd_productos
    SET stock_actual = CASE WHEN p_tipo_movimiento = 1 THEN stock_actual + p_cantidad
                             ELSE stock_actual - p_cantidad END,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id_producto;
    RETURN v_id;
END; $$;

-- ---- prd_movimientos_listar ----
CREATE OR REPLACE FUNCTION prd_movimientos_listar(
    p_id_producto INT DEFAULT NULL, p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL, p_tipo INT DEFAULT NULL
) RETURNS TABLE (
    id INT, id_producto INT, producto VARCHAR, tipo_movimiento INT,
    tipo_movimiento_txt TEXT, cantidad NUMERIC, precio_unitario NUMERIC,
    motivo VARCHAR, fecha_movimiento TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.id_producto, p.nombre, m.tipo_movimiento,
           CASE m.tipo_movimiento WHEN 1 THEN 'Entrada' ELSE 'Salida' END,
           m.cantidad, m.precio_unitario, m.motivo, m.fecha_movimiento
    FROM prd_movimientos m JOIN prd_productos p ON p.id = m.id_producto
    WHERE m.estado = 1
      AND (p_id_producto IS NULL OR m.id_producto = p_id_producto)
      AND (p_fecha_desde IS NULL OR m.fecha_movimiento::DATE >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR m.fecha_movimiento::DATE <= p_fecha_hasta)
      AND (p_tipo IS NULL OR m.tipo_movimiento = p_tipo)
    ORDER BY m.fecha_movimiento DESC, m.id DESC;
END; $$;

-- ---- prd_dashboard_resumen ----
CREATE OR REPLACE FUNCTION prd_dashboard_resumen(
    p_fecha_desde DATE DEFAULT NULL, p_fecha_hasta DATE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_desde DATE := COALESCE(p_fecha_desde, (NOW() AT TIME ZONE 'America/Lima')::DATE - INTERVAL '30 days');
    v_hasta DATE := COALESCE(p_fecha_hasta, (NOW() AT TIME ZONE 'America/Lima')::DATE);
    v_result JSON;
BEGIN
    WITH movimientos AS (
        SELECT m.*, p.precio_compra, p.precio_venta
        FROM prd_movimientos m JOIN prd_productos p ON p.id = m.id_producto
        WHERE m.estado = 1 AND m.fecha_movimiento::DATE BETWEEN v_desde AND v_hasta
    ),
    kpis AS (
        SELECT
            (SELECT COUNT(*) FROM prd_productos WHERE estado = 1) AS total_productos,
            (SELECT COALESCE(SUM(stock_actual),0) FROM prd_productos WHERE estado = 1) AS stock_total,
            (SELECT COALESCE(SUM(stock_actual * precio_compra),0) FROM prd_productos WHERE estado = 1) AS valor_inventario,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 1 THEN cantidad ELSE 0 END),0) AS entradas,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 2 THEN cantidad ELSE 0 END),0) AS salidas,
            COALESCE(SUM(CASE WHEN tipo_movimiento = 2 THEN cantidad * (precio_venta - precio_compra) ELSE 0 END),0) AS ganancia_estimada
        FROM movimientos
    ),
    serie AS (
        SELECT d::DATE AS fecha,
               COALESCE(SUM(CASE WHEN m.tipo_movimiento = 1 THEN m.cantidad END),0) AS entradas,
               COALESCE(SUM(CASE WHEN m.tipo_movimiento = 2 THEN m.cantidad END),0) AS salidas
        FROM generate_series(v_desde, v_hasta, INTERVAL '1 day') d
        LEFT JOIN movimientos m ON m.fecha_movimiento::DATE = d::DATE
        GROUP BY d ORDER BY d
    ),
    por_tipo AS (
        SELECT tp.nombre AS tipo, COUNT(p.id) AS productos,
               COALESCE(SUM(p.stock_actual),0) AS stock
        FROM prd_productos p JOIN gen_lista_opciones tp ON tp.id = p.id_tipo_producto
        WHERE p.estado = 1 GROUP BY tp.nombre ORDER BY productos DESC
    )
    SELECT json_build_object(
        'rango', json_build_object('desde', v_desde, 'hasta', v_hasta),
        'kpis',  (SELECT row_to_json(k) FROM kpis k),
        'serie', (SELECT COALESCE(json_agg(row_to_json(s)),'[]'::json) FROM serie s),
        'por_tipo', (SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json) FROM por_tipo t)
    ) INTO v_result;
    RETURN v_result;
END; $$;

-- ---- auth_usuarios_listar ----
CREATE OR REPLACE FUNCTION auth_usuarios_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (id INT, nombre VARCHAR, correo VARCHAR, fecha_creacion TIMESTAMP)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.nombre, u.correo, u.fecha_creacion
    FROM auth_usuarios u
    WHERE u.estado = 1
      AND (p_texto IS NULL OR u.nombre ILIKE '%'||p_texto||'%' OR u.correo ILIKE '%'||p_texto||'%')
    ORDER BY u.fecha_creacion DESC, u.id DESC;
END; $$;

-- ---- auth_usuarios_crear ----
CREATE OR REPLACE FUNCTION auth_usuarios_crear(
    p_nombre VARCHAR, p_correo VARCHAR, p_password TEXT, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = LOWER(p_correo) AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado.'; END IF;
    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.'; END IF;

    INSERT INTO auth_usuarios (nombre, correo, password_hash,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombre, LOWER(p_correo), crypt(p_password, gen_salt('bf')),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ---- auth_usuarios_actualizar ----
CREATE OR REPLACE FUNCTION auth_usuarios_actualizar(
    p_id INT, p_nombre VARCHAR, p_correo VARCHAR, p_password TEXT, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth_usuarios WHERE correo = LOWER(p_correo) AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'El correo ya está registrado en otro usuario.'; END IF;
    IF p_password IS NOT NULL AND LENGTH(p_password) > 0 AND LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'La contraseña debe tener al menos 6 caracteres.'; END IF;

    UPDATE auth_usuarios
    SET nombre = p_nombre, correo = LOWER(p_correo),
        password_hash = CASE
            WHEN p_password IS NOT NULL AND LENGTH(p_password) > 0
                THEN crypt(p_password, gen_salt('bf'))
            ELSE password_hash END,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

-- ---- auth_usuarios_eliminar (soft) ----
CREATE OR REPLACE FUNCTION auth_usuarios_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF p_id = 1 THEN
        RAISE EXCEPTION 'El usuario administrador no puede eliminarse.'; END IF;
    UPDATE auth_usuarios SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

-- ---- trb_trabajadores_listar ----
CREATE OR REPLACE FUNCTION trb_trabajadores_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (id INT, nombres VARCHAR, apellidos VARCHAR, dni VARCHAR, labor VARCHAR, fecha_creacion TIMESTAMP)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.nombres, t.apellidos, t.dni, t.labor, t.fecha_creacion
    FROM trb_trabajadores t
    WHERE t.estado = 1
      AND (p_texto IS NULL OR t.nombres ILIKE '%'||p_texto||'%'
           OR t.apellidos ILIKE '%'||p_texto||'%' OR t.dni ILIKE '%'||p_texto||'%'
           OR COALESCE(t.labor,'') ILIKE '%'||p_texto||'%')
    ORDER BY t.apellidos, t.nombres;
END; $$;

-- ---- trb_trabajadores_crear ----
CREATE OR REPLACE FUNCTION trb_trabajadores_crear(
    p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR,
    p_labor VARCHAR, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe un trabajador con ese DNI.'; END IF;
    INSERT INTO trb_trabajadores (nombres, apellidos, dni, labor,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombres, p_apellidos, p_dni, NULLIF(p_labor,''),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ---- trb_trabajadores_actualizar ----
CREATE OR REPLACE FUNCTION trb_trabajadores_actualizar(
    p_id INT, p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR,
    p_labor VARCHAR, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe otro trabajador con ese DNI.'; END IF;
    UPDATE trb_trabajadores
    SET nombres = p_nombres, apellidos = p_apellidos, dni = p_dni,
        labor = NULLIF(p_labor,''),
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

-- ---- auth_login ----
CREATE OR REPLACE FUNCTION auth_login(p_correo VARCHAR, p_password TEXT)
RETURNS TABLE (id INT, nombre VARCHAR, correo VARCHAR)
LANGUAGE plpgsql SECURITY DEFINER SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.nombre, u.correo
    FROM auth_usuarios u
    WHERE u.correo = LOWER(p_correo)
      AND u.estado = 1
      AND u.password_hash IS NOT NULL
      AND u.password_hash = crypt(p_password, u.password_hash);
END; $$;
GRANT EXECUTE ON FUNCTION auth_login(VARCHAR, TEXT) TO anon, authenticated;

-- Password del admin demo si aún no tiene
UPDATE auth_usuarios
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE id = 1 AND password_hash IS NULL;

-- ---- trb_trabajadores_eliminar (soft) ----
CREATE OR REPLACE FUNCTION trb_trabajadores_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE trb_trabajadores SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

-- ---- trb_consumos_registrar ----
CREATE OR REPLACE FUNCTION trb_consumos_registrar(
    p_id_trabajador INT, p_id_producto INT, p_cantidad NUMERIC, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE
    v_precio_venta NUMERIC; v_stock NUMERIC; v_nombre TEXT;
    v_mov_id INT; v_id INT; v_total NUMERIC;
BEGIN
    IF p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;

    SELECT precio_venta, stock_actual INTO v_precio_venta, v_stock
    FROM prd_productos WHERE id = p_id_producto AND estado = 1;
    IF v_precio_venta IS NULL THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF v_stock < p_cantidad THEN RAISE EXCEPTION 'Stock insuficiente. Disponible: %', v_stock; END IF;

    SELECT nombres || ' ' || apellidos INTO v_nombre
    FROM trb_trabajadores WHERE id = p_id_trabajador AND estado = 1;
    IF v_nombre IS NULL THEN RAISE EXCEPTION 'Trabajador no encontrado.'; END IF;

    v_total := p_cantidad * v_precio_venta;

    INSERT INTO prd_movimientos (id_producto, tipo_movimiento, cantidad, precio_unitario,
        motivo, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_producto, 2, p_cantidad, v_precio_venta,
        'Consumo trabajador: ' || v_nombre, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_mov_id;

    UPDATE prd_productos SET stock_actual = stock_actual - p_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id_producto;

    INSERT INTO trb_consumos (id_trabajador, id_producto, cantidad, precio_unitario, total,
        id_movimiento, id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_id_trabajador, p_id_producto, p_cantidad, v_precio_venta, v_total,
        v_mov_id, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ---- trb_consumos_listar ----
CREATE OR REPLACE FUNCTION trb_consumos_listar(
    p_id_trabajador INT DEFAULT NULL,
    p_fecha_desde   DATE DEFAULT NULL,
    p_fecha_hasta   DATE DEFAULT NULL
)
RETURNS TABLE (
    id INT, id_trabajador INT, trabajador TEXT, dni VARCHAR,
    id_producto INT, producto VARCHAR, unidad_medida VARCHAR,
    cantidad NUMERIC, precio_unitario NUMERIC, total NUMERIC,
    fecha_consumo TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.id_trabajador,
           (t.nombres || ' ' || t.apellidos)::TEXT, t.dni,
           c.id_producto, p.nombre, um.nombre,
           c.cantidad, c.precio_unitario, c.total, c.fecha_consumo
    FROM trb_consumos c
    JOIN trb_trabajadores t ON t.id = c.id_trabajador
    JOIN prd_productos p    ON p.id = c.id_producto
    JOIN gen_lista_opciones um ON um.id = p.id_unidad_medida
    WHERE c.estado = 1
      AND (p_id_trabajador IS NULL OR c.id_trabajador = p_id_trabajador)
      AND (p_fecha_desde  IS NULL OR c.fecha_consumo::DATE >= p_fecha_desde)
      AND (p_fecha_hasta  IS NULL OR c.fecha_consumo::DATE <= p_fecha_hasta)
    ORDER BY c.fecha_consumo DESC, c.id DESC;
END; $$;

-- ---- trb_consumos_revertir (hard delete + devuelve stock) ----
CREATE OR REPLACE FUNCTION trb_consumos_revertir(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_cantidad NUMERIC; v_id_producto INT; v_id_mov INT;
BEGIN
    SELECT cantidad, id_producto, id_movimiento
      INTO v_cantidad, v_id_producto, v_id_mov
    FROM trb_consumos WHERE id = p_id;
    IF v_cantidad IS NULL THEN RETURN; END IF;
    UPDATE prd_productos SET stock_actual = stock_actual + v_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = v_id_producto;
    IF v_id_mov IS NOT NULL THEN DELETE FROM prd_movimientos WHERE id = v_id_mov; END IF;
    DELETE FROM trb_consumos WHERE id = p_id;
END; $$;

-- ---- trb_consumos_eliminar (soft — se mantiene por compatibilidad) ----
CREATE OR REPLACE FUNCTION trb_consumos_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_cantidad NUMERIC; v_id_producto INT; v_id_mov INT;
BEGIN
    SELECT cantidad, id_producto, id_movimiento
      INTO v_cantidad, v_id_producto, v_id_mov
    FROM trb_consumos WHERE id = p_id AND estado = 1;
    IF v_cantidad IS NULL THEN RETURN; END IF;

    UPDATE trb_consumos SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;

    IF v_id_mov IS NOT NULL THEN
        UPDATE prd_movimientos SET estado = 0,
            id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
        WHERE id = v_id_mov;
    END IF;

    UPDATE prd_productos SET stock_actual = stock_actual + v_cantidad,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = v_id_producto;
END; $$;

-- ============================================================
--  FIN — instalación completada
-- ============================================================
