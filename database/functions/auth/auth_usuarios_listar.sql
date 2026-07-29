CREATE OR REPLACE FUNCTION auth_usuarios_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id INT, nombre VARCHAR, correo VARCHAR, fecha_creacion TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.nombre, u.correo, u.fecha_creacion
    FROM auth_usuarios u
    WHERE u.estado = 1
      AND (p_texto IS NULL OR u.nombre ILIKE '%' || p_texto || '%' OR u.correo ILIKE '%' || p_texto || '%')
    ORDER BY u.fecha_creacion DESC, u.id DESC;
END; $$;
