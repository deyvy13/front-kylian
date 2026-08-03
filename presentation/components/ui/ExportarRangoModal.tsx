"use client";
import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { DateRangeFilter, rangePresets, type DateRange } from "./DateRangeFilter";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (rango: DateRange) => Promise<void> | void;
  titulo?: string;
  descripcion?: string;
};

/** Modal reutilizable que pide un rango antes de exportar a Excel. */
export function ExportarRangoModal({
  open, onClose, onConfirm,
  titulo = "Exportar a Excel",
  descripcion = "Elige el rango de fechas que se incluirá en el archivo.",
}: Props) {
  const [rango, setRango] = useState<DateRange>(rangePresets.ultimos30());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setRango(rangePresets.ultimos30()); setLoading(false); }
  }, [open]);

  async function confirmar() {
    setLoading(true);
    try { await onConfirm(rango); onClose(); }
    finally { setLoading(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      description={descripcion}
      size="sm"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={loading} onClick={confirmar} disabled={!rango.from}>
            <FileSpreadsheet className="h-4 w-4" /> Exportar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <span className="text-xs font-semibold text-foreground/70 block mb-1.5">Rango de fechas</span>
          <DateRangeFilter value={rango} onApply={setRango} className="w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setRango(rangePresets.hoy())}>Hoy</Button>
          <Button size="sm" variant="ghost" onClick={() => setRango(rangePresets.ultimos7())}>7 días</Button>
          <Button size="sm" variant="ghost" onClick={() => setRango(rangePresets.ultimos30())}>30 días</Button>
        </div>
        {rango.from && (
          <p className="text-xs text-foreground/60">
            El nombre del archivo incluirá el rango elegido.
          </p>
        )}
      </div>
    </Modal>
  );
}
