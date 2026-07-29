import { supabase, getCurrentUserId } from "@/core/lib/supabase";
import type { DashboardResumen, Movimiento, Producto } from "@/core/types";

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

export async function dashboardResumen(desde: string | null, hasta: string | null): Promise<DashboardResumen> {
  const { data, error } = await supabase.rpc("prd_dashboard_resumen", {
    p_fecha_desde: desde,
    p_fecha_hasta: hasta,
  });
  if (error) throw error;
  return data as DashboardResumen;
}
