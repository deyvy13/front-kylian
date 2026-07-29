import { supabase } from "@/core/lib/supabase";
import type { SessionUser } from "@/core/lib/session";

export async function loginConCorreo(correo: string, password: string): Promise<SessionUser> {
  const { data, error } = await supabase.rpc("auth_login", {
    p_correo: correo.trim().toLowerCase(),
    p_password: password,
  });
  if (error) throw error;
  const arr = (data ?? []) as SessionUser[];
  if (arr.length === 0) throw new Error("Credenciales inválidas.");
  return arr[0];
}
