"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input, Textarea } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { registrarMovimiento } from "@/core/services/productos.service";
import { esUnidadEntera } from "@/core/lib/utils";
import type { Producto } from "@/core/types";

/**
 * Modal para registrar únicamente ENTRADAS de stock (compras / reposición).
 * Las salidas se gestionan desde la tab Consumos.
 */
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

  useEffect(() => {
    if (!open || !producto) return;
    setCantidad(""); setMotivo("");
    setPrecio(String(Number(producto.precio_compra).toFixed(2)));
  }, [open, producto]);

  async function submit() {
    if (!producto) return;
    const c = Number(cantidad);
    if (!c || c <= 0) return toast.push("error", "La cantidad debe ser mayor a 0.");
    if (entera && !Number.isInteger(c)) {
      return toast.push("error", `La unidad "${producto.unidad_medida}" solo admite cantidades enteras.`);
    }

    setSaving(true);
    try {
      await registrarMovimiento({
        id_producto: producto.id,
        tipo_movimiento: 1, // entrada
        cantidad: c,
        precio_unitario: Number(precio) || producto.precio_compra,
        motivo: motivo || null,
      });
      toast.push("success", "Ingreso registrado.");
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
      description={producto ? `Stock actual: ${producto.stock_actual} ${producto.unidad_medida}` : undefined}
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
          hint={entera ? `Solo cantidades enteras (unidad: ${producto?.unidad_medida}).` : undefined}
        />
        <Input
          label="Precio unitario (S/)"
          type="number" min="0" step="0.5" inputMode="decimal"
          value={precio} onChange={(e) => setPrecio(e.target.value)}
          hint="Precargado con el precio de compra."
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Motivo (opcional)"
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Compra a proveedor, reposición…"
          />
        </div>
      </div>
    </Modal>
  );
}
