-- ============================================================
--  FIX RLS — deshabilita Row Level Security en las tablas del
--  sistema. Ejecutar UNA VEZ en el SQL Editor de Supabase si
--  las tablas se crearon con "Enable RLS" activo y no ves datos.
--
--  Es seguro para este proyecto: aún no hay login real, todas las
--  operaciones pasan por las funciones (SECURITY INVOKER) y el
--  acceso a la base sigue restringido por la anon key.
-- ============================================================

ALTER TABLE auth_usuarios       DISABLE ROW LEVEL SECURITY;
ALTER TABLE gen_lista           DISABLE ROW LEVEL SECURITY;
ALTER TABLE gen_lista_opciones  DISABLE ROW LEVEL SECURITY;
ALTER TABLE prd_productos       DISABLE ROW LEVEL SECURITY;
ALTER TABLE prd_movimientos     DISABLE ROW LEVEL SECURITY;

-- Módulo Trabajadores (si ya lo creaste)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'trb_trabajadores') THEN
        EXECUTE 'ALTER TABLE trb_trabajadores DISABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'trb_consumos') THEN
        EXECUTE 'ALTER TABLE trb_consumos DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;
