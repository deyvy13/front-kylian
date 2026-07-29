-- ============================================================
-- Módulo: auth (autenticación)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_usuarios (
    id                      SERIAL PRIMARY KEY,
    nombre                  VARCHAR(150) NOT NULL,
    correo                  VARCHAR(150) UNIQUE NOT NULL,
    -- vinculación opcional con supabase.auth.users (uuid)
    auth_uid                UUID,
    estado                  INT NOT NULL DEFAULT 1,
    id_usuario_creacion     INT REFERENCES auth_usuarios(id),
    id_usuario_modificacion INT REFERENCES auth_usuarios(id),
    fecha_creacion          TIMESTAMP DEFAULT NOW(),
    fecha_modificacion      TIMESTAMP DEFAULT NOW()
);

-- Usuario demo (permite satisfacer FKs de auditoría hasta tener login real)
INSERT INTO auth_usuarios (id, nombre, correo, id_usuario_creacion, id_usuario_modificacion)
VALUES (1, 'Administrador', 'admin@kylianjose.local', 1, 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('auth_usuarios_id_seq', GREATEST((SELECT MAX(id) FROM auth_usuarios), 1));
