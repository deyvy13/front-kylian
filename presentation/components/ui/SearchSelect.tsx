"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn, normalizarTexto } from "@/core/lib/utils";

export type SearchSelectOption = {
  value: string | number;
  label: string;
  hint?: string;
};

type Props = {
  options: SearchSelectOption[];
  value: string | number | "";
  onChange: (v: string | number | "") => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  searchPlaceholder?: string;
};

export function SearchSelect({
  options, value, onChange,
  label, placeholder = "Selecciona…",
  required, hint, error, disabled, clearable = true,
  className, searchPlaceholder = "Buscar…",
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    if (!q) return options;
    const s = normalizarTexto(q);
    return options.filter((o) =>
      normalizarTexto(o.label).includes(s) ||
      normalizarTexto(o.hint ?? "").includes(s)
    );
  }, [options, q]);

  // Posicionamiento con portal — calcula sobre el trigger real
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const dropHeight = 320;
      const espacioAbajo = window.innerHeight - r.bottom;
      const openUpward = espacioAbajo < dropHeight && r.top > dropHeight;
      setPos({
        top: openUpward ? r.top + window.scrollY - 6 : r.bottom + window.scrollY + 6,
        left: r.left + window.scrollX,
        width: r.width,
        openUpward,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (dropRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dropdown = open && mounted ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        transform: pos.openUpward ? "translateY(-100%)" : undefined,
        backgroundColor: "var(--surface)",
        zIndex: 100,
      }}
      className="rounded-2xl border border-[color:var(--border)] shadow-[0_10px_30px_rgba(15,32,68,0.15)] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--border)]">
        <Search className="h-4 w-4 text-foreground/50 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
        />
        {q && (
          <button onClick={() => setQ("")} className="rounded p-0.5 hover:bg-foreground/10" aria-label="Limpiar búsqueda">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-foreground/60">Sin coincidencias</p>
        ) : filtered.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition",
                active
                  ? "bg-[color:var(--primary)]/10 text-[color:var(--primary)] font-semibold"
                  : "hover:bg-foreground/5"
              )}
            >
              <span className="flex-1 truncate">
                {o.label}
                {o.hint ? <span className="ml-1 text-xs text-foreground/50">· {o.hint}</span> : null}
              </span>
              {active ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label ? (
        <span className="text-xs font-semibold text-foreground/70 inline-flex items-center gap-1 mb-1.5">
          {label}
          {required ? <span className="text-[color:var(--danger)] font-bold" aria-label="obligatorio">*</span> : null}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-11 px-4 rounded-2xl text-sm text-left flex items-center gap-2",
          "bg-[color:var(--surface)] border border-[color:var(--border)]",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent",
          "disabled:opacity-60",
          error && "border-[color:var(--danger)] ring-1 ring-[color:var(--danger)]"
        )}
      >
        <span className={cn("flex-1 truncate", !selected && "text-foreground/40")}>
          {selected ? selected.label : placeholder}
        </span>
        {clearable && selected && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation(); e.preventDefault(); onChange("");
              }
            }}
            className="rounded-md p-0.5 hover:bg-foreground/10 cursor-pointer"
            aria-label="Limpiar"
          ><X className="h-3.5 w-3.5" /></span>
        ) : null}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-foreground/60 transition", open && "rotate-180")} />
      </button>

      {dropdown}

      {error ? (
        <span className="mt-1 block text-xs text-[color:var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-foreground/60">{hint}</span>
      ) : null}
    </div>
  );
}
