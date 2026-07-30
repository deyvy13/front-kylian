# Kylian José — Guía de QA / Casos de uso

Documento para pruebas manuales desde la UI de producción. Cubre módulos, reglas de negocio, casos borde y consistencia entre módulos.

**Zona horaria:** todas las fechas y horas son `America/Lima`.
**Moneda:** Soles peruanos (`S/`), formato `#,##0.00`.
**Convenciones UI:** verde = crear/guardar, ámbar = editar/revertir, rojo = cancelar/eliminar, azul = ver/exportar. Modales con blur de fondo. Tablas en desktop, fichas en móvil (breakpoint `lg`).

---

## 0. Preparación

- **Cuenta demo**: `admin@kylianjose.local` / `admin123`.
- Requerido en Supabase (ejecutados una vez):
  - `database/instalacion.sql`
  - `database/fix_rls.sql` (opcional si el RLS está activo)
  - `database/actualizacion_labor_login.sql`
  - `database/actualizacion_pagos.sql`
  - `database/actualizacion_seguridad.sql` (con `c_max_int := 11`)
  - `database/actualizacion_usuarios.sql`
- Para datos de prueba: `database/seed/datos_prueba.sql`. Para limpiar: `database/seed/datos_prueba_revertir.sql`.

---

## 1. Autenticación

### 1.1 Login exitoso
1. Ir a la raíz sin sesión → debe redirigir a `/login`.
2. Ingresar `admin@kylianjose.local` + `admin123` → clic **Ingresar**.
- **Esperado**: toast "Bienvenid@, Administrador.", redirige a `/`, sidebar aparece con el nombre del usuario abajo.

### 1.2 Login con credenciales inválidas
1. Correo válido, contraseña mala → **Ingresar**.
- **Esperado**: toast "Credenciales inválidas." (mensaje genérico, no distingue si el correo existe o no).

### 1.3 Rate limit del login
1. Fallar el login **11 veces** con el mismo correo.
- **Esperado**: al intento 11 el sistema bloquea ese correo por **10 minutos**. Cualquier intento posterior (correcto o no) muestra: "Demasiados intentos. Intenta nuevamente en X minuto(s).".
2. Login exitoso antes del intento 11 → reinicia el contador.

### 1.4 Ojito de contraseña
1. En login o modal de usuario, escribir en el campo contraseña.
2. Clic en el ícono del ojo.
- **Esperado**: texto visible; segundo clic vuelve a ocultar. Toggle no envía el formulario (tabIndex -1).

### 1.5 Logout
1. Sidebar → chip del usuario abajo → **Cerrar sesión**.
- **Esperado**: localStorage limpio, redirige a `/login`. Si intentás volver atrás en el navegador → redirige a login otra vez.

### 1.6 Guard de rutas
1. Sin sesión, escribir manualmente `/productos`, `/consumos`, `/usuarios`, etc.
- **Esperado**: siempre redirige a `/login`.
2. Con sesión, escribir `/login`.
- **Esperado**: redirige a `/`.

### 1.7 Persistencia de sesión
1. Cerrar y reabrir el navegador (sin logout).
- **Esperado**: sigue logueado (localStorage `kj_session`).

---

## 2. Layout, sidebar y responsive

### 2.1 Sidebar colapsable (desktop)
1. En desktop, clic al toggle del header (íconos `PanelLeftClose` / `PanelLeftOpen`).
- **Esperado**: sidebar pasa de 256px a ~92px con solo íconos; el título "KJ" queda visible.
2. Hover a un ítem cuando está colapsado → tooltip nativo con el nombre.

### 2.2 Drawer móvil
1. En móvil (≤ 1024px), clic al ícono hamburguesa del header.
- **Esperado**: sidebar entra desde la izquierda con backdrop oscuro. Clic afuera o en la X → se cierra.
2. Cambiar de ruta → el drawer se cierra solo.
3. Verificar que **NO** haya espacio blanco fantasma a la izquierda cuando el drawer está cerrado.

### 2.3 Item activo
- El ítem del módulo actual se muestra con fondo azul degradado + sombra interior blanca (clay glow).

### 2.4 Modo claro / oscuro
1. Header → botón sol/luna → alterna.
- **Esperado**: todos los componentes cambian de tema. Persiste al recargar. Aurora de fondo cambia tono.

### 2.5 Fondo del sistema
- Verifica que exista un degradado radial azul/violeta detrás de todo, visible en zonas vacías. Se ve fijo al hacer scroll.

---

## 3. Dashboard

### 3.1 Filtro global de fechas
1. Clic en **Hoy** / **7 días** / **30 días** → el chip activo se pone azul brillante.
2. Abrir `DateRangeFilter`, seleccionar 1er clic = fecha inicio, 2do clic = fecha fin, botón **Aplicar filtro**.
- **Esperado**: el rango se aplica a todas las gráficas y KPIs de la tab actual y también al cambiar de tab.
3. Botón **Limpiar** del calendario → borra el rango.
4. Si haces clic en un día "menor" que el inicio ya seleccionado → los ordena automáticamente.

### 3.2 Tabs isla (arriba centrado)
- Se ven **Productos** y **Consumos** como chips en una isla flotante.
- Solo un chip activo a la vez, con degradado azul.

### 3.3 Dashboard Productos
- **KPIs**: Productos, Stock total, Valor inventario, Ganancia estimada, Entradas, Salidas.
- **Área chart** "Movimientos por día": series **Entradas** (verde) y **Salidas** (ámbar).
- **Bar chart** "Productos por tipo".
- Tooltips muestran moneda formateada.

### 3.4 Dashboard Consumos
- **KPIs (4)**: Registros, Cantidad total, Valor consumido, Deuda pendiente (créditos sin pagar del rango).
- **Área chart** "Consumo por día": series **Total consumido** (azul) y **A crédito** (ámbar).
- **Bar chart** "Consumo por método de pago" (crédito/efectivo/yape/depósito).
- **Top deudas pendientes**: lista agrupada por trabajador con la suma de sus deudas activas (solo créditos con `pagado=0`), top 6 en descendente. Verifica manualmente contra el listado detallado.

### 3.5 KPIs en móvil
1. Abrir dashboard con datos grandes (ej. valor inventario > 1,000,000).
- **Esperado**: el número entra completo, sin puntos suspensivos; ícono más pequeño (`h-7 w-7`), padding reducido, tipografía `text-base font-bold` en móvil.

---

## 4. Módulo Productos → Tab Productos

### 4.1 Crear producto (sin stock inicial)
1. Botón **Nuevo producto** → modal.
2. Todos los campos con `*` rojo son obligatorios.
3. Escribir nombre "arroz costeño" → verificar que se **capitaliza automáticamente** ("Arroz Costeño").
4. Seleccionar tipo y unidad desde los SearchSelect (verificar búsqueda sin tildes: "abarrote" encuentra "Abarrotes").
5. Precio compra: `10`. Modo **% de ganancia**: `30` → precio de venta se calcula solo (`13.00`).
6. Cambiar a modo **Ingresar precio de venta**: escribir `15` → % de ganancia se recalcula (`50.00`).
7. Cambiar precio de compra a `20` con modo % activo → precio de venta se recalcula.
8. Ficha "Ganancia por unidad" muestra `S/ X.XX` en tiempo real.
9. **Guardar cambios (verde)**.
- **Esperado**: toast "Producto creado", tabla se refresca, producto aparece con stock 0.

### 4.2 Crear producto CON stock inicial
1. Igual que 4.1 pero completar "Cantidad / stock inicial" = `50`.
- **Esperado**: producto creado con stock 50, y **se genera un movimiento de entrada** con motivo "Stock inicial" (visible en el detalle del producto).

### 4.3 Validaciones del formulario
- Sin nombre → error "Ingresa el nombre del producto".
- Sin tipo → "Selecciona el tipo de producto".
- Precio compra ≤ 0 → error.
- Precio venta ≤ 0 → error.
- Cancelar (rojo) cierra sin guardar.

### 4.4 Editar producto
1. Fila → botón **ámbar** (`Pencil`) → modal precargado.
- **Esperado**: no aparece "Stock inicial" (solo al crear). Cambiar precio → guarda con auditoría (`id_usuario_modificacion`, `fecha_modificacion`).

### 4.5 Eliminar producto (soft delete)
1. Fila → botón **rojo** (`Trash2`) → modal de confirmación.
- **Esperado**: toast "Producto quitado", desaparece del listado. La palabra "eliminar" **no aparece** en la UI. En BD `estado = 0`, no se destruye la fila.

### 4.6 Ver detalle
1. Fila → botón **azul** (`Eye`) → modal.
- **Esperado**: 6 fichas con KPIs (stock, precios, ganancia, tipo), y un **historial de movimientos** ordenado del más nuevo al más viejo. Chip **verde "Entrada"** y **ámbar "Salida"**.

### 4.7 Filtros
- **Buscar** por nombre — sin tildes ("jose" encuentra "José").
- **Tipo de producto** (SearchSelect) — filtra en vivo.
- **Rango de fechas** — filtra por `fecha_creacion` del producto.
- KPIs superiores (Productos, Stock, Valor, Ganancia) se recalculan según lo filtrado.

### 4.8 Exportar Excel
1. Aplicar filtros → clic **Exportar Excel** (azul).
- **Esperado**: descarga `productos_YYYY-MM-DD.xlsx` con:
  - Cabecera azul (`#0056D6`) texto blanco negrita.
  - Filas alternadas (zebra).
  - AutoFilter en cabecera.
  - Panel congelado en fila 1.
  - Columnas: Nombre, Tipo, Unidad, Stock, P. compra, P. venta, % Ganancia, Ganancia unitaria.
  - Sin columnas de auditoría.

### 4.9 Tabla ↔ fichas
- Desktop (`≥ lg`): tabla con 8 columnas.
- Móvil/tablet (`< lg`): **fichas** en 1 o 2 columnas, con KPIs internos y grid de 3 acciones (ver/editar/eliminar).

### 4.10 Botón "Movimiento" por producto
- **YA NO EXISTE**. Verificar que no aparece en tabla ni ficha. Los movimientos ocurren automáticamente al registrar consumos o al crear producto con stock inicial.

---

## 5. Módulo Productos → Tab Consumos

### 5.1 Registrar consumo — no crédito
1. Clic **Registrar consumo** (verde).
2. **Método**: Efectivo, Yape o Depósito.
- El campo Trabajador queda etiquetado "Trabajador (opcional)" y es **opcional**.
3. Seleccionar producto y cantidad.
- Si la unidad es entera (Unidad, Docena, Caja, Botella, Bolsa, Paquete) → el input rechaza decimales (regex quita puntos/comas) y valida `Number.isInteger` al enviar. Hint: "Solo cantidades enteras."
- Otras unidades (Kg, Litro, etc.): `step="0.01"`.
4. Total = cantidad × precio venta del producto (visible en vivo en la ficha inferior).
5. **Registrar consumo**.
- **Esperado**:
  - Toast "Consumo registrado."
  - Se descuenta stock del producto.
  - Se crea un `prd_movimientos` tipo salida (motivo: "Consumo (metodo): trabajador o cliente").
  - El consumo queda con `pagado=1` (no genera deuda).

### 5.2 Registrar consumo — crédito
1. Clic **Registrar consumo** → método **Crédito**.
- El label del trabajador cambia a "Trabajador" **con asterisco rojo** (obligatorio).
- Aparece badge ámbar "Crédito" abajo.
2. Sin seleccionar trabajador → error "Para un consumo a crédito debes seleccionar al trabajador".
3. Con trabajador → **Registrar**.
- **Esperado**:
  - Toast "Consumo registrado como deuda."
  - Descuenta stock, crea movimiento.
  - `pagado=0`, `id_pago=null`, sumado a "Deuda pendiente" del KPI y del top del dashboard.

### 5.3 Validaciones al registrar consumo
- Sin producto → error.
- Cantidad ≤ 0 → error.
- Cantidad > stock disponible → error "Stock insuficiente. Disponible: X".
- Unidad entera con decimal → error.

### 5.4 Filtros de consumos
- **Trabajador** (SearchSelect, buscable por nombre o DNI).
- **Método de pago** (todos / crédito / efectivo / yape / depósito).
- **Estado** (todos / pendientes de pago / ya pagados). Solo aplica realmente a créditos.
- **Rango de fechas** (por `fecha_consumo`).
- KPIs (Registros, Cantidad, Valor, Deuda) se recalculan.

### 5.5 Chips por método (visual)
- Crédito → ámbar, Efectivo → verde, Yape → morado, Depósito → azul.
- Fila crédito con `pagado=0` → texto rojo "Pendiente" en la columna Estado.
- Crédito `pagado=1` → texto verde "Pagado".

### 5.6 Revertir consumo
1. Fila → botón **ámbar** "Revertir" (`Undo2`).
2. Modal de confirmación → **Sí, confirmar**.
- **Esperado**:
  - El consumo se **elimina en duro** de `trb_consumos`.
  - Se elimina en duro el `prd_movimientos` asociado.
  - **La cantidad vuelve al stock del producto**.
  - Toast "Consumo revertido."
- **Bloqueo**: si el consumo ya está en un pago (`id_pago != null`), el botón está **deshabilitado** con tooltip "Ya fue pagado". Si por API se intentara, la función lanza "Este consumo ya fue pagado…".

### 5.7 Registrar pago de créditos
1. Clic **Registrar pago** (ámbar).
2. SearchSelect "Trabajador con deudas" muestra solo trabajadores con créditos pendientes + total en el hint.
3. Al elegir uno → carga sus consumos pendientes con checkbox, **todos preseleccionados por defecto**.
4. Botón **Seleccionar/Deseleccionar todos**.
5. Método de pago: Efectivo / Yape / Depósito / **Descuento de salario**.
6. Total en vivo se muestra en el label del botón: "Registrar pago — S/ X.XX".
7. **Registrar pago**.
- **Esperado**:
  - Toast "Pago registrado por S/ X.XX".
  - Se crea 1 fila en `trb_pagos` con el monto total.
  - Cada consumo seleccionado queda `pagado=1` y `id_pago = nuevo pago`.
  - Ese trabajador desaparece del selector si ya no tiene deudas.
  - En consumos, los pagados aparecen como "Pagado" verde y ya no permiten revertir.
- **Validaciones**:
  - Sin trabajador → error.
  - Sin consumos seleccionados → botón disabled y error si se fuerza.
  - Si en el interín otro admin pagó esos consumos, la RPC lanza "No hay deudas válidas en la selección".

### 5.8 Exportar Excel de consumos
1. Aplicar filtros → **Exportar Excel** (azul).
- **Esperado**: `consumos_trabajadores_YYYY-MM-DD.xlsx` con:
  - Cabecera azul, zebra, autofilter, congelado en fila 1.
  - Columnas: Trabajador, DNI, Producto, Unidad, Cantidad, Precio unitario, Valor total, Fecha de consumo.
  - Fecha en formato Excel nativo `dd/mm/yyyy hh:mm` en **hora Lima** (comparar con la fila del listado: deben coincidir la fecha y la hora exactas, no 5 horas más).

### 5.9 Consistencia stock ↔ movimientos ↔ consumos
- Después de cualquier consumo o revertir, el stock del producto en la **tab Productos** debe reflejarlo.
- En el **detalle del producto** debería aparecer el movimiento de salida con motivo "Consumo (metodo): Nombre Apellido" o "cliente".
- Al revertir, el movimiento asociado también desaparece del histórico.

---

## 6. Módulo Trabajadores

### 6.1 Crear trabajador
1. **Nuevo trabajador** (verde).
2. Nombres y apellidos → verificar `titleCase` automático.
3. DNI: solo dígitos, entre 8 y 15. Con `<8` → error "El DNI debe tener al menos 8 dígitos".
4. **Labor** (opcional, texto libre respetando mayúsculas/minúsculas — no aplica titleCase).
5. Guardar.
- **Esperado**: aparece en la lista, chip azul con la labor (si tiene).

### 6.2 Validaciones DNI
- DNI duplicado (existente) → error "Ya existe un trabajador con ese DNI".
- No permite letras (`replace(/\D/g,'')` en el onChange).

### 6.3 Editar / Eliminar trabajador
- Editar (ámbar) → modal precargado. Guardar respeta auditoría.
- Eliminar (rojo) → soft delete `estado=0`. Al eliminar, sus consumos previos siguen visibles en la tab Consumos (con nombre del trabajador guardado en el join, o "(sin trabajador)" si `id_trabajador` es null).

### 6.4 Filtro
- **Buscar** por nombres, apellidos, DNI o labor — sin tildes.
- KPIs: "Trabajadores activos" y "Coincidencias" (según filtro).

### 6.5 Ya no hay tab de consumos aquí
- Verificar que solo está el CRUD de trabajadores (los consumos viven en Productos → Consumos).

---

## 7. Módulo Usuarios

### 7.1 Crear usuario
1. **Nuevo usuario** (verde).
2. Nombre → titleCase.
3. Correo (email válido) — se guarda en minúsculas.
4. Contraseña + Repetir contraseña (mínimo **8 caracteres**). Ambos tienen ojito.
- **Validaciones**:
  - Contraseña < 8 → error.
  - Contraseñas distintas → error "Las contraseñas no coinciden".
  - Correo duplicado → error de la BD "El correo ya está registrado".
5. Guardar.

### 7.2 Editar usuario
- Al editar, los campos password quedan en blanco. Si dejás blanco → **conserva la contraseña actual**. Si escribís → la reemplaza (con el hash bcrypt nuevo).
- Cambiar correo a uno usado por otro → error.

### 7.3 Admin no eliminable
- Botón eliminar del usuario **id=1** está deshabilitado en tabla y fichas móvil.

### 7.4 Detalle
- Botón azul (Eye) → modal con nombre, avatar de iniciales, correo, fecha de registro.

### 7.5 Login con usuario recién creado
1. Cerrar sesión.
2. Loguearse con el nuevo correo y contraseña.
- **Esperado**: entra sin problemas. El chip del sidebar muestra su nombre.

---

## 8. Reglas transversales

### 8.1 Auditoría
- Toda tabla tiene: `estado`, `id_usuario_creacion`, `id_usuario_modificacion`, `fecha_creacion`, `fecha_modificacion`.
- Cada acción de crear/editar/eliminar registra el usuario logueado como `id_usuario_modificacion`.
- Verificar en Supabase: crear un producto con usuario `admin` (id=1) y otro producto con un usuario nuevo (id=2). En la tabla `prd_productos` deben quedar los IDs correctos.

### 8.2 Soft delete
- Ninguna acción de "eliminar" (excepto revertir consumo) borra físicamente. Se pone `estado=0`.
- Registros con `estado=0` no aparecen en ningún listado ni son referenciables por FKs nuevas.

### 8.3 Timezone
- Crear producto → verificar `fecha_creacion` en la tabla. Debe ser la hora local de Lima (no UTC).
- Consumo hecho a las 13:30 hora Lima → el listado muestra "13:30" y el Excel exporta "13:30" (no 18:30 UTC).

### 8.4 Formato moneda
- Todo importe se muestra como `S/ 1,234.56` (locale es-PE, `Intl.NumberFormat` currency PEN).

### 8.5 Capitalización automática
- Los inputs marcados con `titleCase`: nombre de producto, nombres de trabajador, apellidos, nombre de usuario.
- Escribir "PÉREZ" → convierte a "Pérez"; "juan carlos" → "Juan Carlos".
- Labor **no** aplica titleCase (libre).

### 8.6 Búsqueda sin tildes
- En cualquier input de búsqueda o SearchSelect: "peru" encuentra "Perú", "jose" encuentra "José", "arroz costeño" encuentra "arroz costeno" (y viceversa).

### 8.7 Botones con color obligatorio
- No debe existir botón "sin color" en toda la UI.
- Verificar que "Cancelar" en cada modal sea rojo, "Cerrar" (detalles) rojo, "Guardar/Registrar/Crear" verde, "Editar" ámbar, "Ver/Exportar" azul, "Revertir" ámbar.

### 8.8 Modales
- Fondo con backdrop blur.
- Contenido con superficie sólida (no transparente).
- Escape cierra; clic afuera cierra; scroll interno con `max-h-[75vh]`.
- Body queda sin scroll mientras hay modal abierto.

### 8.9 Toasts
- Éxito verde, error rojo, info azul.
- Se auto-cierran en 3.5s.

### 8.10 SearchSelect
- Siempre buscable.
- Muestra placeholder cuando no hay selección.
- Botón X para limpiar (si `clearable=true`).
- Escape cierra el panel.
- El dropdown pasa por encima del modal (z-80 vs modal z-60).

---

## 9. Seguridad

### 9.1 Sesión
- localStorage `kj_session` = `{id, nombre, correo}`.
- No hay token JWT; el `id_usuario` se envía como parámetro a cada RPC (limitación asumida — ver 9.4).

### 9.2 Login
- Rate limit: 11 intentos antes de bloqueo de 10 minutos. Reseteo tras login OK.
- Mensaje genérico "Credenciales inválidas".
- Contraseñas hasheadas con **bcrypt** (`crypt + gen_salt('bf')`).

### 9.3 Contraseña
- Mínimo 8 caracteres al crear/actualizar.
- Ojito para ver mientras se escribe.

### 9.4 Limitación conocida (RLS off)
- La anon key está en el bundle cliente (normal para Supabase).
- RLS está deshabilitado en las tablas del sistema.
- Consecuencia: alguien con conocimientos técnicos puede llamar RPCs directamente pasando `p_id_usuario` que quiera. Aceptable mientras el URL no sea público. Para pasar a producción real: reactivar RLS + integrar Supabase Auth nativo.

---

## 10. PWA / instalación

### 10.1 Favicon
- La pestaña del navegador muestra un icono con degradado azul→morado y "KJ" blanco.

### 10.2 Instalar en Android
1. Chrome móvil → menú → **Instalar aplicación** (o Añadir a pantalla de inicio).
2. Confirmar.
- **Esperado**: icono "KJ" azul→morado en el launcher, nombre "Kylian José". Al abrir corre en modo standalone (sin barra de navegador).

### 10.3 Instalar en iOS
1. Safari → Compartir → **Añadir a pantalla de inicio**.
- **Esperado**: icono "KJ" (iOS aplica su recorte redondeado).

---

## 11. Escenarios integrales (E2E manual)

### 11.1 Ciclo compra → venta → consumo → pago
1. Crear producto "Test Arroz" con stock inicial 100, precio compra 10, precio venta 15.
2. En Consumos: registrar consumo del trabajador Juan (crédito) de 3 unidades → stock queda en 97, deuda de 45.00.
3. En Consumos: registrar otro consumo del mismo trabajador (crédito) de 2 unidades → stock 95, deuda total 75.00.
4. Otro consumo en efectivo de 5 unidades → stock 90, sin deuda.
5. Dashboard Consumos → verificar KPI "Deuda pendiente" = 75.00 y que Juan aparece en top deudas con 75.00.
6. Registrar pago de Juan con método Yape → seleccionar solo el consumo de 45.00 → total 45.00 → confirmar. Deuda pasa a 30.00. Consumo de 45 queda "Pagado" y no se puede revertir.
7. Revertir el consumo en efectivo de 5 unidades → stock vuelve a 95, movimiento eliminado del histórico.
8. Exportar Excel de consumos → verificar 3 filas (dos créditos + ninguno el revertido).
9. Eliminar producto "Test Arroz" → soft delete. Ya no aparece en listado, pero los consumos históricos siguen mostrando el nombre.
10. Ir a Dashboard → todo debe recalcularse coherentemente.

### 11.2 Ciclo usuario
1. Crear usuario "María" con contraseña `pruebita8`.
2. Cerrar sesión → loguearse como María.
3. Crear un producto → verificar `id_usuario_creacion=2` (o el id de María).
4. Cerrar sesión → intentar loguear 11 veces con contraseña errónea → bloqueo por 10 min.
5. Volver a admin (otro correo, no bloqueado) → entra bien.
6. Editar María cambiando solo el nombre (contraseña en blanco) → sigue logueando con `pruebita8`.
7. Cambiar contraseña de María a `nuevaclave1` → login con la anterior falla, con la nueva funciona.

### 11.3 Consistencia móvil ↔ desktop
1. Crear datos en desktop.
2. Abrir el mismo módulo en móvil.
- **Esperado**: fichas equivalentes con misma información y acciones. Iconos más pequeños en KPIs para que quepan números grandes.

---

## 12. Bugs candidatos / puntos a monitorear

- Sesión sin expiración: se mantiene indefinidamente. Cerrar sesión manualmente si el equipo es compartido.
- RLS off (ver 9.4).
- El botón "Nuevo consumo" no está deshabilitado si no hay productos con stock — al enviar, el mensaje "Stock insuficiente" es la única defensa.
- Al eliminar un producto con consumos históricos, esos consumos siguen apareciendo con el nombre del producto (join a `prd_productos` que NO filtra por `estado`). Comportamiento intencional para no perder historial, pero verificar que no se rompan cálculos.
- Al eliminar un trabajador que tenía consumos pendientes de crédito, esos consumos siguen ahí pero el trabajador ya no aparece en el selector de pagos. Riesgo: deudas "huérfanas" imposibles de pagar desde la UI. Workaround: reactivar el trabajador manualmente en la BD (`estado=1`) o registrar el pago directamente por SQL.
