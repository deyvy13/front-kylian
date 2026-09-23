"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Copy, FileSpreadsheet } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { DateRangeFilter, rangePresets, type DateRange } from "./DateRangeFilter";
import { useToast } from "./Toast";
import { getErrorMessage } from "@/core/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (rango: DateRange) => Promise<void> | void;
  titulo?: string;
  descripcion?: string;
  /** Correo/contacto del desarrollador que se muestra al usuario si falla. */
  contactoDev?: string;
};

/** Modal reutilizable que pide un rango antes de exportar a Excel.
 *  Si el export falla, muestra el detalle técnico dentro del mismo modal
 *  con un botón para copiar y enviárselo al desarrollador. */
export function ExportarRangoModal({
  open, onClose, onConfirm,
  titulo = "Exportar a Excel",
  descripcion = "Elige el rango de fechas que se incluirá en el archivo.",
  contactoDev = "deyvyjmm@gmail.com",
}: Props) {
  const toast = useToast();
  const [rango, setRango] = useState<DateRange>(rangePresets.ultimos30());
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setRango(rangePresets.ultimos30()); setLoading(false); setErrorInfo(null); }
  }, [open]);

  function armarReporte(msg: string): string {
    const ahora = new Date().toISOString();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "n/a";
    return [
      `Módulo: ${titulo}`,
      `Fecha del intento: ${ahora}`,
      `Rango solicitado: ${rango.from ?? "—"} → ${rango.to ?? "—"}`,
      `Error: ${msg}`,
      `Agente: ${ua}`,
    ].join("\n");
  }

  async function confirmar() {
    setLoading(true);
    setErrorInfo(null);
    try {
      await onConfirm(rango);
      onClose();
    } catch (e) {
      const msg = getErrorMessage(e, "Error desconocido durante la exportación");
      setErrorInfo(armarReporte(msg));
    } finally { setLoading(false); }
  }

  async function copiar() {
    if (!errorInfo) return;
    try {
      await navigator.clipboard.writeText(errorInfo);
      toast.push("success", "Detalle copiado. Envíaselo al desarrollador.");
    } catch {
      toast.push("error", "No se pudo copiar. Selecciónalo manualmente.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      description={descripcion}
      size="md"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cerrar</Button>
          {!errorInfo && (
            <Button variant="success" loading={loading} onClick={confirmar} disabled={!rango.from}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar
            </Button>
          )}
          {errorInfo && (
            <Button variant="warning" onClick={() => { setErrorInfo(null); }}>
              Volver a intentar
            </Button>
          )}
        </>
      }
    >
      {!errorInfo ? (
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
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-[color:var(--danger)] shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-[color:var(--danger)]">
                  No se pudo completar la exportación
                </p>
                <p className="text-foreground/80">
                  Envía el siguiente detalle al desarrollador
                  {contactoDev ? <> (<span className="font-mono">{contactoDev}</span>)</> : null} para
                  que lo revise. Puedes intentar de nuevo con el botón amarillo o cerrar.
                </p>
              </div>
            </div>
          </div>
          <textarea
            readOnly
            value={errorInfo}
            className="w-full h-40 text-[11px] font-mono rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 resize-none"
          />
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={copiar}>
              <Copy className="h-4 w-4" /> Copiar al portapapeles
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
