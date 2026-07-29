import { supabase, getCurrentUserId } from "@/core/lib/supabase";
import type { Usuario } from "@/core/types";

export async function listarUsuarios(texto?: string | null): Promise<Usuario[]> {
  const { data, error } = await supabase.rpc("auth_usuarios_listar", { p_texto: texto ?? null });
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

export async function crearUsuario(input: { nombre: string; correo: string; password: string }): Promise<number> {
  const { data, error } = await supabase.rpc("auth_usuarios_crear", {
    p_nombre: input.nombre,
    p_correo: input.correo,
    p_password: input.password,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
  return data as number;
}

export async function actualizarUsuario(id: number, input: { nombre: string; correo: string; password?: string }) {
  const { error } = await supabase.rpc("auth_usuarios_actualizar", {
    p_id: id,
    p_nombre: input.nombre,
    p_correo: input.correo,
    p_password: input.password && input.password.length > 0 ? input.password : null,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}

export async function eliminarUsuario(id: number) {
  const { error } = await supabase.rpc("auth_usuarios_eliminar", {
    p_id: id,
    p_id_usuario: getCurrentUserId(),
  });
  if (error) throw error;
}
