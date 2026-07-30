"use client";
import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { cn, formatDateLima, toISODateLima } from "@/core/lib/utils";

export type DateRange = { from: string | null; to: string | null }; // yyyy-mm-dd

type Props = {
  value: DateRange;
  onApply: (range: DateRange) => void;
  onClear?: () => void;
  className?: string;
  align?: "left" | "right";
};

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function parseYMD(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function ymd(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function DateRangeFilter({ value, onApply, onClear, className, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [cursor, setCursor] = useState<Date>(() => parseYMD(value.from) ?? new Date());
  const [pos, setPos] = useState({ top: 0, left: 0, openUpward: false });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setDraft(value), [value.from, value.to]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      const dropHeight = 380;
      const dropWidth = 320;
      const espacioAbajo = window.innerHeight - r.bottom;
      const openUpward = espacioAbajo < dropHeight && r.top > dropHeight;
      const leftBase = align === "right" ? r.right - dropWidth : r.left;
      const left = Math.max(8, Math.min(leftBase + window.scrollX, window.innerWidth - dropWidth - 8));
      setPos({
        top: openUpward ? r.top + window.scrollY - 6 : r.bottom + window.scrollY + 6,
        left,
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
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = useMemo(() => {
    if (value.from && value.to) return `${formatDateLima(value.from)} → ${formatDateLima(value.to)}`;
    if (value.from) return `Desde ${formatDateLima(value.from)}`;
    return "Seleccione las fechas";
  }, [value.from, value.to]);

  const grid = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function handleDayClick(d: Date) {
    const iso = ymd(d);
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: iso, to: null });
      return;
    }
    const from = draft.from;
    if (iso < from) setDraft({ from: iso, to: from });
    else setDraft({ from, to: iso });
  }

  const inRange = (d: Date) => {
    if (!draft.from || !draft.to) return false;
    const s = ymd(d);
    return s >= draft.from && s <= draft.to;
  };

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: pos.top, left: pos.left, width: 320,
        transform: pos.openUpward ? "translateY(-100%)" : undefined,
        backgroundColor: "var(--surface)",
        zIndex: 100,
      }}
      className="rounded-2xl border border-[color:var(--border)] shadow-[0_10px_30px_rgba(15,32,68,0.15)] p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-xl hover:bg-foreground/5"
          aria-label="Mes anterior"
        ><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-sm font-semibold">{MESES[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-xl hover:bg-foreground/5"
          aria-label="Mes siguiente"
        ><ChevronRight className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-foreground/60 mb-1">
        {DIAS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = ymd(d);
          const isFrom = draft.from === iso;
          const isTo = draft.to === iso;
          const isIn = inRange(d);
          return (
            <button
              key={i}
              onClick={() => handleDayClick(d)}
              className={cn(
                "h-8 rounded-lg text-xs font-medium transition",
                "hover:bg-[color:var(--primary)]/15",
                (isFrom || isTo) && "bg-[color:var(--primary)] text-[color:var(--primary-fg)] font-bold",
                isIn && !isFrom && !isTo && "bg-[color:var(--primary)]/20"
              )}
            >{d.getDate()}</button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-foreground/60">
          {draft.from ? formatDateLima(draft.from) : "—"} → {draft.to ? formatDateLima(draft.to) : "—"}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          size="sm" variant="ghost"
          onClick={() => { setDraft({ from: null, to: null }); onClear?.(); onApply({ from: null, to: null }); setOpen(false); }}
        >Limpiar</Button>
        <Button
          size="sm" variant="success"
          disabled={!draft.from}
          onClick={() => { onApply(draft); setOpen(false); }}
        >Aplicar filtro</Button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold",
          "bg-[color:var(--surface)] border border-[color:var(--border)]",
          "hover:bg-[color:var(--surface-2)] active:scale-[0.98]"
        )}
      >
        <Calendar className="h-4 w-4" />
        <span>{label}</span>
      </button>
      {panel}
    </div>
  );
}

export const rangePresets = {
  hoy(): DateRange {
    const d = toISODateLima(new Date());
    return { from: d, to: d };
  },
  ultimos7(): DateRange {
    const t = new Date();
    const from = new Date(); from.setDate(t.getDate() - 6);
    return { from: toISODateLima(from), to: toISODateLima(t) };
  },
  ultimos30(): DateRange {
    const t = new Date();
    const from = new Date(); from.setDate(t.getDate() - 29);
    return { from: toISODateLima(from), to: toISODateLima(t) };
  },
};
