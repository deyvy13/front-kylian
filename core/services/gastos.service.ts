import { supabase, getCurrentUserId } from "@/core/lib/supabase";
import type { DashboardFinanzas, Gasto } from "@/core/types";

export async function listarGastos(f: {
  desde?: string | null; hasta?: string | null; texto?: string | null;
} = {}): Promise<Gasto[]> {
  const { data, error } = await supabase.rpc("gst_gastos_listar", {
    p_fecha_desde: f.desde ?? null,
    p_fecha_hasta: f.hasta ?? null,
    p_texto:       f.texto ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Gasto[];
}

export async function listarGastosPaginado(
  f: { desde?: string | null; hasta?: string | null; texto?: string | null; limit: number; offset: number }
): Promise<{ rows: Gasto[]; total: number }> {
  const { data, error } = await supabase.rpc("gst_gastos_listar", {
    p_fecha_desde: f.desde ?? null,
    p_fecha_hasta: f.hasta ?? null,
    p_texto:       f.texto ?? null,
    p_limit:       f.limit,
    p_offset:      f.offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as (Gasto & { total_count?: number })[];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function crearGasto(input: { monto: number; concepto: string; fecha_gasto: string }) {
  const { data, error } = await supabase.rpc("gst_gastos_crear", {
    p_monto: input.monto,
    p_concepto: input.concepto,
    p_fecha_gasto: input.fecha_gasto,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function actualizarGasto(id: number, input: { monto: number; concepto: string; fecha_gasto: string }) {
  const { error } = await supabase.rpc("gst_gastos_actualizar", {
    p_id: id,
    p_monto: input.monto,
    p_concepto: input.concepto,
    p_fecha_gasto: input.fecha_gasto,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function eliminarGasto(id: number) {
  const { error } = await supabase.rpc("gst_gastos_eliminar", {
    p_id: id, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function dashboardFinanzas(desde: string | null, hasta: string | null): Promise<DashboardFinanzas> {
  const { data, error } = await supabase.rpc("gst_dashboard_finanzas", {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
  });
  if (error) throw error;
  return data as DashboardFinanzas;
}
