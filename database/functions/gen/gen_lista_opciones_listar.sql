-- Devuelve las opciones activas de una lista por nombre de lista
CREATE OR REPLACE FUNCTION gen_lista_opciones_listar(p_lista_nombre VARCHAR)
RETURNS TABLE (
    id          INT,
    nombre      VARCHAR,
    descripcion VARCHAR
)
LANGUAGE plpgsql
SET timezone = 'America/Lima'
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.nombre, o.descripcion
    FROM gen_lista_opciones o
    JOIN gen_lista l ON l.id = o.id_lista
    WHERE l.nombre = p_lista_nombre
      AND o.estado = 1
      AND l.estado = 1
    ORDER BY o.nombre;
END;
$$;
