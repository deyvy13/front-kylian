-- ============================================================
-- Módulo: trb (trabajadores)
-- ============================================================
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

ALTER TABLE trb_trabajadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE trb_consumos     DISABLE ROW LEVEL SECURITY;
