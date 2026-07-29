"use client";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Mail, User as UserIcon, Calendar } from "lucide-react";
import type { Usuario } from "@/core/types";
import { formatDateLima } from "@/core/lib/utils";

export function UsuarioDetalleModal({
  open, onClose, usuario,
}: { open: boolean; onClose: () => void; usuario: Usuario | null }) {
  if (!usuario) return null;

  const iniciales = usuario.nombre.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de usuario"
      footer={<Button variant="danger" onClick={onClose}>Cerrar</Button>}
    >
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--primary)] text-[color:var(--primary-fg)] text-lg font-black">
          {iniciales || <UserIcon className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">{usuario.nombre}</p>
          <p className="text-sm text-foreground/60 truncate">{usuario.correo}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
            <Mail className="h-4 w-4" /> Correo
          </div>
          <p className="mt-1 text-sm font-semibold break-all">{usuario.correo}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
            <Calendar className="h-4 w-4" /> Registrado
          </div>
          <p className="mt-1 text-sm font-semibold">{formatDateLima(usuario.fecha_creacion, true)}</p>
        </div>
      </div>
    </Modal>
  );
}
