import { supabase, getCurrentUserId } from "@/core/lib/supabase";
import type { DashboardResumen, HistoricoProducto, IngresoStockResultado, Movimiento, Producto } from "@/core/types";

export type FiltrosProducto = {
  idTipo?: number | null;
  desde?: string | null;
  hasta?: string | null;
  texto?: string | null;
};

export async function listarProductos(f: FiltrosProducto = {}): Promise<Producto[]> {
  const { data, error } = await supabase.rpc("prd_productos_listar", {
    p_id_tipo_producto: f.idTipo ?? null,
    p_fecha_desde: f.desde ?? null,
    p_fecha_hasta: f.hasta ?? null,
    p_texto: f.texto ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Producto[];
}

export type ProductosTotales = {
  total_productos: number;
  stock_total: number;
  valor_stock: number;
  ganancia_total: number;
};

export async function totalesProductos(f: FiltrosProducto = {}): Promise<ProductosTotales> {
  const { data, error } = await supabase.rpc("prd_productos_totales", {
    p_id_tipo_producto: f.idTipo ?? null,
    p_fecha_desde:      f.desde ?? null,
    p_fecha_hasta:      f.hasta ?? null,
    p_texto:            f.texto ?? null,
  });
  if (error) throw error;
  const row = (data ?? [])[0] as ProductosTotales | undefined;
  return row ?? { total_productos: 0, stock_total: 0, valor_stock: 0, ganancia_total: 0 };
}

/** Trae TODOS los productos del filtro paginando internamente en chunks
 *  de 1000 para evitar el corte del `max-rows` de PostgREST/Supabase. */
export async function listarProductosCompleto(f: FiltrosProducto = {}): Promise<Producto[]> {
  const CHUNK = 1000;
  const all: Producto[] = [];
  let offset = 0;
  let chunkIdx = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const { rows } = await listarProductosPaginado({ ...f, limit: CHUNK, offset });
      all.push(...rows);
      if (rows.length < CHUNK) break;
      offset += CHUNK;
      chunkIdx += 1;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Error al descargar productos (chunk #${chunkIdx + 1}, offset ${offset}, ` +
        `traídos hasta ahora ${all.length}): ${raw}`
      );
    }
  }
  return all;
}

export async function listarProductosPaginado(
  f: FiltrosProducto & { limit: number; offset: number }
): Promise<{ rows: Producto[]; total: number }> {
  const { data, error } = await supabase.rpc("prd_productos_listar", {
    p_id_tipo_producto: f.idTipo ?? null,
    p_fecha_desde: f.desde ?? null,
    p_fecha_hasta: f.hasta ?? null,
    p_texto: f.texto ?? null,
    p_limit: f.limit,
    p_offset: f.offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as (Producto & { total_count?: number })[];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export type NuevoProducto = {
  nombre: string;
  id_tipo_producto: number;
  id_unidad_medida: number;
  precio_compra: number;
  precio_venta: number;
  porcentaje_ganancia: number;
  stock_inicial: number;
};

export async function crearProducto(p: NuevoProducto): Promise<number> {
  const { data, error } = await supabase.rpc("prd_productos_insertar", {
    p_nombre: p.nombre,
    p_id_tipo_producto: p.id_tipo_producto,
    p_id_unidad_medida: p.id_unidad_medida,
    p_precio_compra: p.precio_compra,
    p_precio_venta: p.precio_venta,
    p_porcentaje_ganancia: p.porcentaje_ganancia,
    p_stock_inicial: p.stock_inicial,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function actualizarProducto(id: number, p: Omit<NuevoProducto, "stock_inicial">) {
  const { error } = await supabase.rpc("prd_productos_actualizar", {
    p_id: id,
    p_nombre: p.nombre,
    p_id_tipo_producto: p.id_tipo_producto,
    p_id_unidad_medida: p.id_unidad_medida,
    p_precio_compra: p.precio_compra,
    p_precio_venta: p.precio_venta,
    p_porcentaje_ganancia: p.porcentaje_ganancia,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function eliminarProducto(id: number) {
  const { error } = await supabase.rpc("prd_productos_eliminar", {
    p_id: id,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function registrarMovimiento(input: {
  id_producto: number;
  tipo_movimiento: 1 | 2;
  cantidad: number;
  precio_unitario?: number;
  motivo?: string | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc("prd_movimientos_registrar", {
    p_id_producto: input.id_producto,
    p_tipo_movimiento: input.tipo_movimiento,
    p_cantidad: input.cantidad,
    p_precio_unitario: input.precio_unitario ?? 0,
    p_motivo: input.motivo ?? null,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function listarMovimientos(f: {
  idProducto?: number | null;
  desde?: string | null;
  hasta?: string | null;
  tipo?: 1 | 2 | null;
} = {}): Promise<Movimiento[]> {
  const { data, error } = await supabase.rpc("prd_movimientos_listar", {
    p_id_producto: f.idProducto ?? null,
    p_fecha_desde: f.desde ?? null,
    p_fecha_hasta: f.hasta ?? null,
    p_tipo: f.tipo ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Movimiento[];
}

export async function ingresarStock(input: {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  motivo?: string | null;
}): Promise<IngresoStockResultado> {
  const { data, error } = await supabase.rpc("prd_stock_ingresar", {
    p_id_producto:     input.id_producto,
    p_cantidad:        input.cantidad,
    p_precio_unitario: input.precio_unitario,
    p_motivo:          input.motivo ?? null,
    p_id_usuario:      getCurrentUserId(),
  });
  if (error) throw error;
  return data as IngresoStockResultado;
}

export type AjusteStockResultado = {
  stock_previo: number;
  stock_nuevo: number;
  cambio: number;
  movimiento_id: number | null;
};

export async function ajustarStock(input: {
  id_producto: number;
  stock_real: number;
  motivo: string;
}): Promise<AjusteStockResultado> {
  const { data, error } = await supabase.rpc("prd_stock_ajustar", {
    p_id_producto: input.id_producto,
    p_stock_real:  input.stock_real,
    p_motivo:      input.motivo,
    p_id_usuario:  getCurrentUserId(),
  });
  if (error) throw error;
  return data as AjusteStockResultado;
}

export async function contarDependenciasProducto(idProducto: number): Promise<{ movimientos: number; consumos: number }> {
  const [mov, con] = await Promise.all([
    supabase.from("prd_movimientos").select("id", { count: "exact", head: true })
      .eq("id_producto", idProducto).eq("estado", 1),
    supabase.from("trb_consumos").select("id", { count: "exact", head: true })
      .eq("id_producto", idProducto).eq("estado", 1),
  ]);
  return { movimientos: mov.count ?? 0, consumos: con.count ?? 0 };
}

export async function revertirIngreso(idMovimiento: number) {
  const { error } = await supabase.rpc("prd_ingreso_revertir", {
    p_id_movimiento: idMovimiento, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function historicoProducto(id: number): Promise<HistoricoProducto> {
  const { data, error } = await supabase.rpc("prd_producto_historico", { p_id: id });
  if (error) throw error;
  const row = (data ?? [])[0] as HistoricoProducto | undefined;
  return row ?? { total_ingresado: 0, total_vendido: 0, ganancia_total: 0, inversion_total: 0 };
}

export async function historicoGlobal(desde: string | null, hasta: string | null): Promise<HistoricoProducto> {
  const { data, error } = await supabase.rpc("prd_historico_global", {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
  });
  if (error) throw error;
  const row = (data ?? [])[0] as HistoricoProducto | undefined;
  return row ?? { total_ingresado: 0, total_vendido: 0, ganancia_total: 0, inversion_total: 0 };
}

export async function dashboardResumen(desde: string | null, hasta: string | null): Promise<DashboardResumen> {
  const { data, error } = await supabase.rpc("prd_dashboard_resumen", {
    p_fecha_desde: desde,
    p_fecha_hasta: hasta,
  });
  if (error) throw error;
  return data as DashboardResumen;
}
