import { createClient } from "@supabase/supabase-js";

// Placeholders para permitir build sin .env; en runtime deben venir del entorno.
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: "public" },
});

/** Usuario actual para auditoría. Se resuelve desde la sesión (localStorage). */
export function getCurrentUserId(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem("kj_session");
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed?.id === "number" ? parsed.id : 1;
  } catch { return 1; }
}
