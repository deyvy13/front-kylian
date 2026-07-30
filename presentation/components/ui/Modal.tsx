"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/core/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Enviamos el foco al contenedor del diálogo para EVITAR que el
    // navegador (especialmente en móvil) auto-enfoque el primer input
    // y abra el teclado sin que el usuario lo pida.
    const t = setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sz = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal
        tabIndex={-1}
        style={{ backgroundColor: "var(--surface)" }}
        className={cn(
          "relative w-full rounded-2xl border border-[color:var(--border)] overflow-hidden outline-none",
          "shadow-[0_10px_30px_rgba(15,32,68,0.18)] animate-[fadeIn_.18s_ease-out]",
          sz
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            {title ? <h2 className="text-lg font-bold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm text-foreground/60">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-foreground/5"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--border)] px-6 py-4 bg-[color:var(--surface-muted)]">
            {footer}
          </div>
        ) : null}
      </div>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>,
    document.body
  );
}
