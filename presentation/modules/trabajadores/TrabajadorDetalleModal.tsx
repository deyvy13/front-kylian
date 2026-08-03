"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { resumenTrabajador } from "@/core/services/trabajadores.service";
import type { Trabajador, TrabajadorResumen } from "@/core/types";
import { formatDateLima, formatPEN } from "@/core/lib/utils";
import { IdCard, ShoppingCart, Coins, AlertCircle, CheckCircle2, ClipboardList, Wallet } from "lucide-react";

export function TrabajadorDetalleModal({
  open, onClose, trabajador,
}: { open: boolean; onClose: () => void; trabajador: Trabajador | null }) {
  const [resumen, setResumen] = useState<TrabajadorResumen | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !trabajador) return;
    setLoading(true);
    resumenTrabajador(trabajador.id)
      .then(setResumen)
      .finally(() => setLoading(false));
  }, [open, trabajador]);

  if (!trabajador) return null;

  const iniciales = (trabajador.nombres[0] ?? "") + (trabajador.apellidos[0] ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de trabajador"
      size="md"
      footer={<Button variant="danger" onClick={onClose}>Cerrar</Button>}
    >
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--primary)] text-white text-lg font-black shrink-0">
          {iniciales.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">{trabajador.apellidos}, {trabajador.nombres}</p>
          <p className="text-sm text-foreground/60 truncate">DNI {trabajador.dni} · {trabajador.labor ?? "—"}</p>
          <p className="text-xs text-foreground/50">Registrado el {formatDateLima(trabajador.fecha_creacion, true)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Ficha icon={<ShoppingCart className="h-4 w-4" />} label="Total consumido"
          value={loading ? "…" : formatPEN(resumen?.total_consumido ?? 0)} />
        <Ficha icon={<AlertCircle className="h-4 w-4" />} label="Deuda actual"
          value={loading ? "…" : formatPEN(resumen?.total_deuda ?? 0)}
          highlight={Number(resumen?.total_deuda ?? 0) > 0 ? "danger" : undefined} />
        <Ficha icon={<CheckCircle2 className="h-4 w-4" />} label="Créditos pagados"
          value={loading ? "…" : formatPEN(resumen?.total_pagado ?? 0)}
          highlight="success" />
        <Ficha icon={<Coins className="h-4 w-4" />} label="Balance activo"
          value={loading ? "…" : formatPEN(
            Number(resumen?.total_consumido ?? 0) - Number(resumen?.total_pagado ?? 0)
          )}
          hint="Total consumido − pagado" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
            <ClipboardList className="h-4 w-4" />N.º de consumos
          </div>
          <p className="mt-1 text-lg font-bold">{loading ? "…" : (resumen?.n_consumos ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
            <Wallet className="h-4 w-4" />N.º de pagos
          </div>
          <p className="mt-1 text-lg font-bold">{loading ? "…" : (resumen?.n_pagos ?? 0)}</p>
        </div>
      </div>

      {trabajador.estado === 0 && (
        <div className="mt-4 rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-3 text-xs text-foreground/80 flex items-center gap-2">
          <IdCard className="h-4 w-4 text-[color:var(--warning)]" />
          Este trabajador está eliminado (inactivo). Su historial se conserva.
        </div>
      )}
    </Modal>
  );
}

function Ficha({ icon, label, value, hint, highlight }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string;
  highlight?: "success" | "danger";
}) {
  const color = highlight === "success" ? "text-[color:var(--success)]"
              : highlight === "danger"  ? "text-[color:var(--danger)]"
              : "";
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
      <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
        {icon}{label}
      </div>
      <p className={`mt-1 text-base font-bold ${color}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-foreground/60">{hint}</p> : null}
    </div>
  );
}
