"use client";
import { getErrorMessage } from "@/core/lib/utils";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { useToast } from "@/presentation/components/ui/Toast";
import { actualizarUsuario, crearUsuario } from "@/core/services/usuarios.service";
import type { Usuario } from "@/core/types";

export function UsuarioFormModal({
  open, onClose, onSaved, usuario,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  usuario?: Usuario | null;
}) {
  const toast = useToast();
  const isEdit = !!usuario;
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (usuario) { setNombre(usuario.nombre); setCorreo(usuario.correo); }
    else { setNombre(""); setCorreo(""); }
    setPassword(""); setPassword2("");
  }, [open, usuario]);

  async function submit() {
    if (!nombre.trim()) return toast.push("error", "Ingresa el nombre.");
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return toast.push("error", "Correo inválido.");
    }
    if (!isEdit || password.length > 0) {
      if (password.length < 8) return toast.push("error", "La contraseña debe tener al menos 8 caracteres.");
      if (password !== password2) return toast.push("error", "Las contraseñas no coinciden.");
    }

    setSaving(true);
    try {
      if (isEdit && usuario) {
        await actualizarUsuario(usuario.id, { nombre: nombre.trim(), correo: correo.trim().toLowerCase(), password });
        toast.push("success", "Usuario actualizado.");
      } else {
        await crearUsuario({ nombre: nombre.trim(), correo: correo.trim().toLowerCase(), password });
        toast.push("success", "Usuario creado.");
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
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      description="Los campos con asterisco rojo son obligatorios."
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Nombre completo" titleCase required
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan Pérez" />
        </div>
        <div className="sm:col-span-2">
          <Input label="Correo electrónico" required type="email" inputMode="email"
            value={correo} onChange={(e) => setCorreo(e.target.value.toLowerCase())}
            placeholder="usuario@correo.com" />
        </div>
        <Input label={isEdit ? "Nueva contraseña" : "Contraseña"}
          required={!isEdit} type="password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          hint={isEdit ? "Deja en blanco para conservarla." : "Mínimo 8 caracteres."} />
        <Input label={isEdit ? "Repetir nueva contraseña" : "Repetir contraseña"}
          required={!isEdit} type="password"
          value={password2} onChange={(e) => setPassword2(e.target.value)} />
      </div>
    </Modal>
  );
}
