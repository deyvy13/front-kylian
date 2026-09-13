"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input, Textarea } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { ajustarStock } from "@/core/services/productos.service";
import { esUnidadEntera, getErrorMessage } from "@/core/lib/utils";
import { Info } from "lucide-react";
import type { Producto } from "@/core/types";

/**
 * Ajuste de stock por conteo físico.
 * Registra un movimiento de entrada o salida según la diferencia y
 * actualiza el stock — sin generar gasto ni cambiar el precio_compra.
 */
export function AjustarStockModal({
  open, onClose, onSaved, producto,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  producto: Producto | null;
}) {
  const toast = useToast();
  const [stockReal, setStockReal] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const entera = esUnidadEntera(producto?.unidad_medida);
  const stockActual = Number(producto?.stock_actual ?? 0);
  const nuevo = Number(stockReal);
  const diff = Number.isFinite(nuevo) ? nuevo - stockActual : 0;

  useEffect(() => {
    if (!open || !producto) return;
    setStockReal(String(producto.stock_actual));
    setMotivo("");
  }, [open, producto]);

  async function submit() {
    if (!producto) return;
    if (stockReal === "" || !Number.isFinite(nuevo) || nuevo < 0) {
      return toast.push("error", "Ingresa un stock real válido (mayor o igual a 0).");
    }
    if (entera && !Number.isInteger(nuevo)) {
      return toast.push("error", `La unidad "${producto.unidad_medida}" solo admite cantidades enteras.`);
    }
    if (!motivo.trim()) return toast.push("error", "Ingresa el motivo del ajuste.");

    setSaving(true);
    try {
      const res = await ajustarStock({
        id_producto: producto.id,
        stock_real: nuevo,
        motivo: motivo.trim(),
      });
      if (res.cambio === 0) {
        toast.push("info", "El stock ya coincidía. No se registró movimiento.");
      } else if (res.cambio < 0) {
        toast.push("success", `Ajuste registrado: se retiraron ${Math.abs(res.cambio)} unidad(es).`);
      } else {
        toast.push("success", `Ajuste registrado: se sumaron ${res.cambio} unidad(es).`);
      }
      onSaved(); onClose();
    } catch (e) {
      toast.push("error", getErrorMessage(e, "Error al ajustar"));
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto ? `Ajustar stock — ${producto.nombre}` : "Ajustar stock"}
      description="Compara con lo que hay realmente en tienda y corrige el stock del sistema."
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>Guardar ajuste</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <p className="text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">Stock actual en sistema</p>
          <p className="mt-1 text-lg font-bold">
            {stockActual}
            <span className="text-xs font-normal text-foreground/60"> {producto?.unidad_medida ?? ""}</span>
          </p>
        </div>
        <Input
          label="Stock real en tienda"
          required
          type="number"
          min="0"
          step={entera ? "1" : "0.01"}
          inputMode={entera ? "numeric" : "decimal"}
          value={stockReal}
          onChange={(e) => {
            const v = e.target.value;
            setStockReal(entera ? v.replace(/[.,]\d*/g, "") : v);
          }}
          hint={entera ? "Solo cantidades enteras." : undefined}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motivo del ajuste"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Conteo físico mensual, error en ingreso previo, merma, robo…"
          />
        </div>
        {stockReal !== "" && Number.isFinite(nuevo) && diff !== 0 && (
          <div className={`sm:col-span-2 rounded-xl border p-3 flex items-start gap-2 ${
            diff < 0
              ? "border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10"
              : "border-[color:var(--success)]/30 bg-[color:var(--success)]/10"
          }`}>
            <Info className={`h-4 w-4 mt-0.5 shrink-0 ${diff < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}`} />
            <div className="text-xs">
              <p className={`font-semibold ${diff < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}`}>
                {diff < 0
                  ? `Se registrará una SALIDA de ${Math.abs(diff)} unidad(es).`
                  : `Se registrará una ENTRADA de ${diff} unidad(es).`}
              </p>
              <p className="text-foreground/70 mt-0.5">
                El ajuste no genera gasto ni modifica el precio de compra.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
