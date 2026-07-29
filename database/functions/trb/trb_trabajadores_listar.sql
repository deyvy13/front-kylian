CREATE OR REPLACE FUNCTION trb_trabajadores_listar(p_texto VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id INT, nombres VARCHAR, apellidos VARCHAR, dni VARCHAR, fecha_creacion TIMESTAMP
)
LANGUAGE plpgsql SET timezone = 'America/Lima' AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.nombres, t.apellidos, t.dni, t.fecha_creacion
    FROM trb_trabajadores t
    WHERE t.estado = 1
      AND (p_texto IS NULL
           OR t.nombres   ILIKE '%'||p_texto||'%'
           OR t.apellidos ILIKE '%'||p_texto||'%'
           OR t.dni       ILIKE '%'||p_texto||'%')
    ORDER BY t.apellidos, t.nombres;
END; $$;
