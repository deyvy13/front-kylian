"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useSession } from "@/presentation/components/auth/SessionProvider";

type Props = { nombre: string; correo: string; collapsed?: boolean };

export function UserMenu({ nombre, correo, collapsed }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useSession();

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const iniciales = nombre.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left",
          "border border-[color:var(--border)] bg-[color:var(--surface-2)] hover:bg-foreground/[0.04]",
          collapsed && "justify-center px-0"
        )}
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--primary)] text-[color:var(--primary-fg)] text-xs font-bold shrink-0">
          {iniciales || <UserIcon className="h-4 w-4" />}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight">{nombre}</p>
              <p className="text-[11px] text-foreground/60 truncate">{correo}</p>
            </div>
            <ChevronUp className={cn("h-4 w-4 shrink-0 transition", open ? "" : "rotate-180")} />
          </>
        )}
      </button>

      {open && (
        <div
          style={{ backgroundColor: "var(--surface)" }}
          className={cn(
            "absolute z-50 bottom-[calc(100%+6px)] rounded-xl border border-[color:var(--border)] p-1",
            "shadow-[0_10px_30px_rgba(15,32,68,0.15)]",
            collapsed ? "left-full ml-2 w-52" : "left-0 right-0"
          )}
        >
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
