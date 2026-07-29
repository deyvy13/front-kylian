const KEY = "kj_session";

export type SessionUser = { id: number; nombre: string; correo: string };

export function loadSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as SessionUser;
    if (typeof u?.id !== "number") return null;
    return u;
  } catch { return null; }
}

export function saveSession(u: SessionUser) {
  window.localStorage.setItem(KEY, JSON.stringify(u));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}
