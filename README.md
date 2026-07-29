# Kylian José — Gestión

Sistema web para controlar productos, stock y movimientos de la bodega **Kylian José**.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + design system propio con claymorfismo sutil
- **Supabase** (Postgres + funciones SQL, sin Edge Functions)
- **Recharts** para gráficos (area / bar)
- **Montserrat** como fuente global · efecto **Aurora Text** en títulos
- **xlsx** para exportación a Excel
- **Modo claro / oscuro** (`next-themes`) + responsive

## Arquitectura

Monolítica y escalable — pensada para agregar backend propio más adelante.

```
core/           # dominio, servicios, tipos, lib (supabase, utils, formatos)
presentation/   # componentes de UI y módulos (dashboard, productos, ...)
app/            # rutas Next.js (App Router)
database/       # scripts SQL — schema, funciones, seed, instalacion.sql
```

## Puesta en marcha

1) **Instalar dependencias**
```bash
npm install
```

2) **Variables de entorno** — copia `.env.local.example` a `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

3) **Base de datos** — abre el SQL Editor de Supabase y ejecuta **de un solo golpe** el archivo:
```
database/instalacion.sql
```
Esto crea tablas, seeds, funciones y setea la zona horaria a `America/Lima`.

4) **Iniciar**
```bash
npm run dev
```
Abre <http://localhost:3000>.

## Módulos actuales

- **Dashboard** — KPIs, gráfico de área (entradas vs salidas), distribución por tipo.
- **Productos** — CRUD con modales, filtros por tipo y rango de fechas, exportar a Excel, registrar entradas y salidas, historial por producto.

## Convenciones

- Prefijos por módulo: `auth_`, `gen_`, `prd_`.
- Todas las tablas llevan campos de auditoría (`estado`, `id_usuario_creacion`, `id_usuario_modificacion`, `fecha_creacion`, `fecha_modificacion`).
- Eliminar = `estado = 0` (soft delete, jamás se menciona en la interfaz).
- Colores de acción: **verde** crear/guardar, **rojo** eliminar, **ámbar** editar.
