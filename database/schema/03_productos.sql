-- ============================================================
-- Módulo: prd (productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS prd_productos (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(200) NOT NULL,
    id_tipo_producto        INT NOT NULL REFERENCES gen_lista_opciones(id),
    id_unidad_medida        INT NOT NULL REFERENCES gen_lista_opciones(id),
    precio_compra           NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_venta            NUMERIC(12,2) NOT NULL DEFAULT 0,
    porcentaje_ganancia     NUMERIC(8,2) NOT NULL DEFAULT 0,
    stock_actual            NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prd_productos_tipo ON prd_productos(id_tipo_producto) WHERE estado = 1;

-- Movimientos de stock (entradas / salidas)
CREATE TABLE IF NOT EXISTS prd_movimientos (
    id                      SERIAL PRIMARY KEY,
    id_producto             INT NOT NULL REFERENCES prd_productos(id),
    -- 1 = entrada, 2 = salida
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
