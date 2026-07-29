-- ============================================================
--  ACTUALIZACIÓN — Campo "labor" en trabajadores + Login
--  Ejecutar en el SQL Editor de Supabase.
-- ============================================================
SET TIME ZONE 'America/Lima';
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- 0. Asegura que auth_usuarios.password_hash exista ----
ALTER TABLE auth_usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ---- 1. trb_trabajadores.labor (opcional) ----
ALTER TABLE trb_trabajadores ADD COLUMN IF NOT EXISTS labor VARCHAR(150);

-- ---- 2. Funciones actualizadas de trabajadores ----
DROP FUNCTION IF EXISTS trb_trabajadores_listar(VARCHAR);
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

DROP FUNCTION IF EXISTS trb_trabajadores_crear(VARCHAR, VARCHAR, VARCHAR, INT);
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
    VALUES (p_nombres, p_apellidos, p_dni, NULLIF(p_labor, ''),
        p_id_usuario, p_id_usuario)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

DROP FUNCTION IF EXISTS trb_trabajadores_actualizar(INT, VARCHAR, VARCHAR, VARCHAR, INT);
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
        labor = NULLIF(p_labor, ''),
        id_usuario_modificacion = p_id_usuario, fecha_modificacion = NOW()
    WHERE id = p_id AND estado = 1;
END; $$;

-- ---- 3. auth_login — valida correo + contraseña con bcrypt ----
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

-- ---- 4. Password del admin demo (solo si aún no tenía) ----
UPDATE auth_usuarios
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE id = 1 AND password_hash IS NULL;
