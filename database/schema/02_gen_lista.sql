-- ============================================================
-- Módulo: gen (listas maestras)
-- ============================================================
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
