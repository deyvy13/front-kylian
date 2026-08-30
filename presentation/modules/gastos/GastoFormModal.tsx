"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { actualizarGasto, crearGasto } from "@/core/services/gastos.service";
import type { Gasto } from "@/core/types";
import { getErrorMessage, toISODateLima } from "@/core/lib/utils";

export function GastoFormModal({
  open, onClose, onSaved, gasto,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  gasto?: Gasto | null;
}) {
  const toast = useToast();
  const isEdit = !!gasto;
  const [monto, setMonto] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("");
  const [fecha, setFecha] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (gasto) {
      setMonto(String(gasto.monto));
      setConcepto(gasto.concepto);
      setFecha(gasto.fecha_gasto);
    } else {
      setMonto(""); setConcepto("");
      setFecha(toISODateLima(new Date()));
    }
  }, [open, gasto]);

  async function submit() {
    const m = Number(monto);
    if (!m || m <= 0) return toast.push("error", "El monto debe ser mayor a 0.");
    if (!concepto.trim()) return toast.push("error", "Ingresa el concepto.");
    if (!fecha) return toast.push("error", "Ingresa la fecha del gasto.");

    setSaving(true);
    try {
      if (isEdit && gasto) {
        await actualizarGasto(gasto.id, { monto: m, concepto: concepto.trim(), fecha_gasto: fecha });
        toast.push("success", "Gasto actualizado.");
      } else {
        await crearGasto({ monto: m, concepto: concepto.trim(), fecha_gasto: fecha });
        toast.push("success", "Gasto registrado.");
      }
      onSaved(); onClose();
    } catch (e) {
      toast.push("error", getErrorMessage(e, "Error al guardar"));
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar gasto" : "Nuevo gasto"}
      description="Los campos con asterisco rojo son obligatorios."
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Monto (S/)" required
          type="number" min="0" step="0.01" inputMode="decimal"
          value={monto} onChange={(e) => setMonto(e.target.value)}
        />
        <Input
          label="Fecha del gasto" required type="date"
          value={fecha} onChange={(e) => setFecha(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Input
            label="Concepto" required capitalizeFirst
            value={concepto} onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej. Recibo de luz, compra a proveedor…"
          />
        </div>
      </div>
    </Modal>
  );
}
