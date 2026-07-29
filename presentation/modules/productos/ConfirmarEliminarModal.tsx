"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";

export function ConfirmarEliminarModal({
  open, onClose, onConfirm, titulo, descripcion,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  titulo?: string;
  descripcion?: string;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo ?? "¿Confirmar acción?"}
      size="sm"
      footer={
        <>
          <Button variant="warning" onClick={onClose}>Cancelar</Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={async () => { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } }}
          >Sí, confirmar</Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--danger)]/15 text-[color:var(--danger)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-foreground/80">
          {descripcion ?? "Esta acción no se puede deshacer."}
        </p>
      </div>
    </Modal>
  );
}
