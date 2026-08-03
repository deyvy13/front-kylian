import { supabase, getCurrentUserId } from "@/core/lib/supabase";
import type { Consumo, DeudaTrabajador, MetodoConsumo, MetodoPago, Pago, Trabajador, TrabajadorResumen } from "@/core/types";

export async function listarTrabajadores(texto?: string | null, estado: 0 | 1 = 1): Promise<Trabajador[]> {
  const { data, error } = await supabase.rpc("trb_trabajadores_listar", {
    p_texto: texto ?? null, p_estado: estado,
  });
  if (error) throw error;
  return (data ?? []) as Trabajador[];
}

export async function reactivarTrabajador(id: number) {
  const { error } = await supabase.rpc("trb_trabajadores_reactivar", {
    p_id: id, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function resumenTrabajador(id: number): Promise<TrabajadorResumen> {
  const { data, error } = await supabase.rpc("trb_trabajador_resumen", { p_id: id });
  if (error) throw error;
  const row = (data ?? [])[0] as TrabajadorResumen | undefined;
  return row ?? { total_consumido: 0, total_pagado: 0, total_deuda: 0, n_consumos: 0, n_pagos: 0 };
}

export async function crearTrabajador(input: { nombres: string; apellidos: string; dni: string; labor?: string | null }) {
  const { data, error } = await supabase.rpc("trb_trabajadores_crear", {
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_dni: input.dni,
    p_labor: input.labor ?? null,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function actualizarTrabajador(id: number, input: { nombres: string; apellidos: string; dni: string; labor?: string | null }) {
  const { error } = await supabase.rpc("trb_trabajadores_actualizar", {
    p_id: id,
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_dni: input.dni,
    p_labor: input.labor ?? null,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function eliminarTrabajador(id: number) {
  const { error } = await supabase.rpc("trb_trabajadores_eliminar", {
    p_id: id, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

/* ================ CONSUMOS ================ */
export async function registrarConsumo(input: {
  id_trabajador: number | null;
  id_producto:   number;
  cantidad:      number;
  metodo_pago:   MetodoConsumo;
}): Promise<number> {
  const { data, error } = await supabase.rpc("trb_consumos_registrar", {
    p_id_trabajador: input.id_trabajador,
    p_id_producto:   input.id_producto,
    p_cantidad:      input.cantidad,
    p_metodo_pago:   input.metodo_pago,
    p_id_usuario:    getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function listarConsumos(f: {
  idTrabajador?:   number | null;
  desde?:          string | null;
  hasta?:          string | null;
  metodoPago?:     MetodoConsumo | null;
  soloPendientes?: 0 | 1 | null;
} = {}): Promise<Consumo[]> {
  const { data, error } = await supabase.rpc("trb_consumos_listar", {
    p_id_trabajador:   f.idTrabajador ?? null,
    p_fecha_desde:     f.desde ?? null,
    p_fecha_hasta:     f.hasta ?? null,
    p_metodo_pago:     f.metodoPago ?? null,
    p_solo_pendientes: f.soloPendientes ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Consumo[];
}

/** Revierte el consumo: borra el registro y devuelve la cantidad al stock. */
export async function revertirConsumo(id: number) {
  const { error } = await supabase.rpc("trb_consumos_revertir", {
    p_id: id, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

/* ================ PAGOS ================ */
export async function listarDeudasPorTrabajador(): Promise<DeudaTrabajador[]> {
  const { data, error } = await supabase.rpc("trb_deudas_por_trabajador");
  if (error) throw error;
  return (data ?? []) as DeudaTrabajador[];
}

export async function registrarPago(input: {
  id_trabajador: number;
  metodo_pago:   MetodoPago;
  ids_consumos:  number[];
}): Promise<number> {
  const { data, error } = await supabase.rpc("trb_pagos_registrar", {
    p_id_trabajador: input.id_trabajador,
    p_metodo_pago:   input.metodo_pago,
    p_ids_consumos:  input.ids_consumos,
    p_id_usuario:    getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function revertirPago(idPago: number) {
  const { error } = await supabase.rpc("trb_pagos_revertir", {
    p_id_pago: idPago, p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function listarPagos(f: {
  idTrabajador?: number | null;
  desde?: string | null; hasta?: string | null;
} = {}): Promise<Pago[]> {
  const { data, error } = await supabase.rpc("trb_pagos_listar", {
    p_id_trabajador: f.idTrabajador ?? null,
    p_fecha_desde:   f.desde ?? null,
    p_fecha_hasta:   f.hasta ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Pago[];
}
