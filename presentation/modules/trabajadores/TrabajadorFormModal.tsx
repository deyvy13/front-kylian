"use client";
import { getErrorMessage } from "@/core/lib/utils";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { actualizarTrabajador, crearTrabajador } from "@/core/services/trabajadores.service";
import type { Trabajador } from "@/core/types";

export function TrabajadorFormModal({
  open, onClose, onSaved, trabajador,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  trabajador?: Trabajador | null;
}) {
  const toast = useToast();
  const isEdit = !!trabajador;
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [labor, setLabor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (trabajador) {
      setNombres(trabajador.nombres);
      setApellidos(trabajador.apellidos);
      setDni(trabajador.dni);
      setLabor(trabajador.labor ?? "");
    } else {
      setNombres(""); setApellidos(""); setDni(""); setLabor("");
    }
  }, [open, trabajador]);

  async function submit() {
    if (!nombres.trim()) return toast.push("error", "Ingresa los nombres.");
    if (!apellidos.trim()) return toast.push("error", "Ingresa los apellidos.");
    if (dni.trim().length < 8) return toast.push("error", "El DNI debe tener al menos 8 dígitos.");

    setSaving(true);
    try {
      const payload = {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim(),
        labor: labor.trim() || null,
      };
      if (isEdit && trabajador) {
        await actualizarTrabajador(trabajador.id, payload);
        toast.push("success", "Trabajador actualizado.");
      } else {
        await crearTrabajador(payload);
        toast.push("success", "Trabajador creado.");
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
      title={isEdit ? "Editar trabajador" : "Nuevo trabajador"}
      description="Los campos con asterisco rojo son obligatorios."
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear trabajador"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nombres" required titleCase value={nombres}
          onChange={(e) => setNombres(e.target.value)} placeholder="Ej. Juan Carlos" />
        <Input label="Apellidos" required titleCase value={apellidos}
          onChange={(e) => setApellidos(e.target.value)} placeholder="Ej. Pérez Ramos" />
        <Input label="DNI" required inputMode="numeric" maxLength={15}
          value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))} placeholder="12345678" />
        <Input label="Labor" value={labor}
          onChange={(e) => setLabor(e.target.value)} placeholder="Ej. Cajera, Almacén, Delivery…"
        />
      </div>
    </Modal>
  );
}
