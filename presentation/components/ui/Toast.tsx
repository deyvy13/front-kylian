"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/core/lib/utils";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; text: string };

const Ctx = createContext<{ push: (k: Kind, t: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[min(360px,90vw)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 text-sm animate-[slideIn_.18s_ease-out]",
              "rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]",
              "shadow-[0_6px_20px_rgba(15,32,68,0.10)]",
              t.kind === "success" && "border-l-4 border-l-[color:var(--success)]",
              t.kind === "error" && "border-l-4 border-l-[color:var(--danger)]",
              t.kind === "info" && "border-l-4 border-l-[color:var(--primary)]"
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="h-5 w-5 text-[color:var(--success)] mt-0.5" />}
            {t.kind === "error" && <XCircle className="h-5 w-5 text-[color:var(--danger)] mt-0.5" />}
            {t.kind === "info" && <Info className="h-5 w-5 text-[color:var(--primary)] mt-0.5" />}
            <span className="flex-1">{t.text}</span>
            <button
              onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}
              className="rounded-lg p-1 hover:bg-foreground/10"
              aria-label="Cerrar"
            ><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast fuera de ToastProvider");
  return c;
}
