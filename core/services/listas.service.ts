import { supabase } from "@/core/lib/supabase";
import type { OpcionLista } from "@/core/types";

export async function listarOpciones(nombreLista: string): Promise<OpcionLista[]> {
  const { data, error } = await supabase.rpc("gen_lista_opciones_listar", {
    p_lista_nombre: nombreLista,
  });
  if (error) throw error;
  return (data ?? []) as OpcionLista[];
}
