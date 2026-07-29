"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, loadSession, saveSession, type SessionUser } from "@/core/lib/session";

type Ctx = {
  user: SessionUser | null;
  ready: boolean;
  setUser: (u: SessionUser) => void;
  logout: () => void;
};

const SessionCtx = createContext<Ctx | null>(null);

const PUBLIC_ROUTES = new Set(["/login"]);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Cargar sesión al montar
  useEffect(() => {
    setUserState(loadSession());
    setReady(true);
  }, []);

  // Redirecciones según sesión
  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_ROUTES.has(pathname);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [ready, user, pathname, router]);

  const setUser = useCallback((u: SessionUser) => {
    saveSession(u);
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUserState(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, ready, setUser, logout }), [user, ready, setUser, logout]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession fuera de SessionProvider");
  return c;
}
