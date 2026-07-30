"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input, Textarea } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { ingresarStock } from "@/core/services/productos.service";
import { esUnidadEntera, formatPEN } from "@/core/lib/utils";
import { Info } from "lucide-react";
import type { Producto } from "@/core/types";

export function IngresoStockModal({
  open, onClose, onSaved, producto,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  producto: Producto | null;
}) {
  const toast = useToast();
  const [cantidad, setCantidad] = useState<string>("");
  const [precio, setPrecio] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const entera = useMemo(() => esUnidadEntera(producto?.unidad_medida), [producto]);
  const cNum = Number(cantidad) || 0;
  const pNum = Number(precio) || 0;

  // Preview de promedio ponderado
  const preview = useMemo(() => {
    if (!producto || cNum <= 0 || pNum < 0) return null;
    const stock = Number(producto.stock_actual);
    const pcActual = Number(producto.precio_compra);
    const pct = Number(producto.porcentaje_ganancia);
    const nuevoPC = stock > 0
      ? Math.round(((stock * pcActual + cNum * pNum) / (stock + cNum)) * 100) / 100
      : pNum;
    const nuevoPV = Math.round(nuevoPC * (1 + (pct || 0) / 100) * 100) / 100;
    return {
      nuevoPC, nuevoPV,
      cambia: Math.abs(nuevoPC - pcActual) > 0.0001,
    };
  }, [producto, cNum, pNum]);

  useEffect(() => {
    if (!open || !producto) return;
    setCantidad(""); setMotivo("");
    setPrecio(String(Number(producto.precio_compra).toFixed(2)));
  }, [open, producto]);

  async function submit() {
    if (!producto) return;
    if (cNum <= 0) return toast.push("error", "La cantidad debe ser mayor a 0.");
    if (entera && !Number.isInteger(cNum)) {
      return toast.push("error", `La unidad "${producto.unidad_medida}" solo admite cantidades enteras.`);
    }
    setSaving(true);
    try {
      const res = await ingresarStock({
        id_producto: producto.id,
        cantidad: cNum,
        precio_unitario: pNum,
        motivo: motivo || null,
      });
      if (res.cambio_precio) {
        toast.push("success", `Ingreso registrado. Nuevo precio de compra: ${formatPEN(res.precio_compra_nuevo)}.`);
      } else {
        toast.push("success", "Ingreso registrado.");
      }
      onSaved(); onClose();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Error al registrar");
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto ? `Registrar ingreso — ${producto.nombre}` : "Registrar ingreso"}
      description={producto ? `Stock actual: ${producto.stock_actual} ${producto.unidad_medida} · P. compra actual: ${formatPEN(producto.precio_compra)}` : undefined}
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>Registrar ingreso</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={`Cantidad ${producto ? `(${producto.unidad_medida})` : ""}`}
          required
          type="number"
          min={entera ? "1" : "0"}
          step={entera ? "1" : "0.01"}
          inputMode={entera ? "numeric" : "decimal"}
          value={cantidad}
          onChange={(e) => {
            const v = e.target.value;
            setCantidad(entera ? v.replace(/[.,]\d*/g, "") : v);
          }}
          hint={entera ? `Solo cantidades enteras.` : undefined}
        />
        <Input
          label="Precio unitario (S/)"
          required
          type="number" min="0" step="0.01" inputMode="decimal"
          value={precio} onChange={(e) => setPrecio(e.target.value)}
          hint="Puede diferir del precio de compra actual."
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motivo (opcional)"
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Compra a proveedor, reposición…"
          />
        </div>

        {preview && preview.cambia ? (
          <div className="sm:col-span-2 rounded-xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-[color:var(--warning)] shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-[color:var(--warning)]">
                  El precio de compra cambiará por promedio ponderado
                </p>
                <p className="text-foreground/70">
                  Precio compra: <b>{formatPEN(producto?.precio_compra ?? 0)}</b> → <b>{formatPEN(preview.nuevoPC)}</b>
                </p>
                <p className="text-foreground/70">
                  Precio venta: <b>{formatPEN(producto?.precio_venta ?? 0)}</b> → <b>{formatPEN(preview.nuevoPV)}</b>
                  <span className="text-foreground/60"> (mantiene {Number(producto?.porcentaje_ganancia ?? 0).toFixed(2)}% de ganancia)</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
