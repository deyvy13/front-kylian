# Base de datos — Kylian José

Estructura:
- `schema/` scripts DDL (tablas). Se ejecutan en orden numérico.
- `functions/` funciones PostgreSQL, una carpeta por módulo abreviado.
- `seed/` datos maestros iniciales.
- `instalacion.sql` script agregado — ejecuta TODO de un solo golpe en Supabase SQL Editor.

Zona horaria: `America/Lima` fijada a nivel de sesión y dentro de cada función.

Convenciones:
- Prefijos por módulo: `auth_` autenticación, `gen_` general/listas maestras, `prd_` productos.
- Auditoría en todas las tablas: `estado`, `id_usuario_creacion`, `id_usuario_modificacion`, `fecha_creacion`, `fecha_modificacion`.
- `estado = 1` activo, `estado = 0` eliminado (soft delete).
