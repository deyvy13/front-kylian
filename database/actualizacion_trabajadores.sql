-- ============================================================
--  ACTUALIZACIÓN — Módulo Trabajadores + Consumos
--  Ejecuta este script en el SQL Editor de Supabase para
--  agregar el módulo sobre una base ya instalada.
-- ============================================================
SET TIME ZONE 'America/Lima';

-- ---- Tablas ----
CREATE TABLE IF NOT EXISTS trb_trabajadores (
    id                      SERIAL PRIMARY KEY,
    nombres                 VARCHAR(150) NOT NULL,
    apellidos               VARCHAR(150) NOT NULL,
    dni                     VARCHAR(15) UNIQUE NOT NULL,
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

ALTER TABLE trb_trabajadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE trb_consumos     DISABLE ROW LEVEL SECURITY;

-- ---- Funciones ----
CREATE OR REPLACE FUNCTION trb_trabajadores_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (id INT, nombres VARCHAR, apellidos VARCHAR, dni VARCHAR, fecha_creacion TIMESTAMP)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.nombres, t.apellidos, t.dni, t.fecha_creacion
    FROM trb_trabajadores t
    WHERE t.estado = 1
      AND (p_texto IS NULL OR t.nombres ILIKE '%'||p_texto||'%'
           OR t.apellidos ILIKE '%'||p_texto||'%' OR t.dni ILIKE '%'||p_texto||'%')
    ORDER BY t.apellidos, t.nombres;
END; $$;

CREATE OR REPLACE FUNCTION trb_trabajadores_crear(
    p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR, p_id_usuario INT
) RETURNS INT
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
DECLARE v_id INT;
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe un trabajador con ese DNI.'; END IF;
    INSERT INTO trb_trabajadores (nombres, apellidos, dni,
        id_usuario_creacion, id_usuario_modificacion)
    VALUES (p_nombres, p_apellidos, p_dni, p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION trb_trabajadores_actualizar(
    p_id INT, p_nombres VARCHAR, p_apellidos VARCHAR, p_dni VARCHAR, p_id_usuario INT
) RETURNS VOID
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    IF LENGTH(p_dni) NOT BETWEEN 8 AND 15 THEN
        RAISE EXCEPTION 'El DNI debe tener entre 8 y 15 caracteres.'; END IF;
    IF EXISTS (SELECT 1 FROM trb_trabajadores WHERE dni = p_dni AND id <> p_id AND estado = 1) THEN
        RAISE EXCEPTION 'Ya existe otro trabajador con ese DNI.'; END IF;
    UPDATE trb_trabajadores
    SET nombres = p_nombres, apellidos = p_apellidos, dni = p_dni,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

CREATE OR REPLACE FUNCTION trb_trabajadores_eliminar(p_id INT, p_id_usuario INT)
RETURNS VOID LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    UPDATE trb_trabajadores SET estado = 0,
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id;
END; $$;

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
