"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search, Users, ShieldCheck } from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { Card, StatCard } from "@/presentation/components/ui/Card";
import { Table, Thead, Tr, Th, Td, EmptyState } from "@/presentation/components/ui/Table";
import { useToast } from "@/presentation/components/ui/Toast";
import { eliminarUsuario, listarUsuarios } from "@/core/services/usuarios.service";
import type { Usuario } from "@/core/types";
import { getErrorMessage, coincideBusqueda, formatDateLima } from "@/core/lib/utils";
import { UsuarioFormModal } from "./UsuarioFormModal";
import { UsuarioDetalleModal } from "./UsuarioDetalleModal";
import { ConfirmarEliminarModal } from "@/presentation/modules/productos/ConfirmarEliminarModal";

export function UsuariosPage() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [detalle, setDetalle] = useState<Usuario | null>(null);
  const [borrar, setBorrar] = useState<Usuario | null>(null);

  async function refrescar() {
    setLoading(true);
    try { setUsuarios(await listarUsuarios(texto || null)); }
    catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
    finally { setLoading(false); }
  }
  useEffect(() => { refrescar(); /* eslint-disable-next-line */ }, []);

  const filtrados = useMemo(() => {
    if (!texto) return usuarios;
    return usuarios.filter((u) => coincideBusqueda(u.nombre, texto) || coincideBusqueda(u.correo, texto));
  }, [usuarios, texto]);

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <AuroraText>Gestión de usuarios</AuroraText>
          </h1>
          <p className="text-sm text-foreground/60 mt-1 hidden sm:block">
            Crea y administra los usuarios del sistema.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button variant="success" onClick={() => { setEditando(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> <span>Nuevo</span>
          </Button>
        </div>
      </div>

      <Card>
        <Input label="Buscar" placeholder="Nombre o correo…"
          value={texto} onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refrescar()}
        />
      </Card>

      {loading ? (
        <Card><p className="py-8 text-center text-foreground/60">Cargando…</p></Card>
      ) : filtrados.length === 0 ? (
        <Card><EmptyState text="No hay usuarios con esa búsqueda." /></Card>
      ) : (
        <>
          {/* Tabla desktop */}
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Nombre</Th>
                  <Th>Correo</Th>
                  <Th>Registrado</Th>
                  <Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <tbody>
                {filtrados.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-semibold">{u.nombre}</Td>
                    <Td className="text-foreground/80">{u.correo}</Td>
                    <Td className="text-foreground/70">{formatDateLima(u.fecha_creacion, true)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="primary" onClick={() => setDetalle(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="warning" onClick={() => { setEditando(u); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setBorrar(u)} disabled={u.id === 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Fichas móvil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filtrados.map((u) => {
              const iniciales = u.nombre.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <Card key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary)] text-white font-bold shrink-0">
                      {iniciales}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{u.nombre}</p>
                      <p className="text-xs text-foreground/60 truncate">{u.correo}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-foreground/60">Registrado: {formatDateLima(u.fecha_creacion)}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => setDetalle(u)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="warning" onClick={() => { setEditando(u); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setBorrar(u)} disabled={u.id === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <UsuarioFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refrescar} usuario={editando} />
      <UsuarioDetalleModal open={!!detalle} onClose={() => setDetalle(null)} usuario={detalle} />
      <ConfirmarEliminarModal
        open={!!borrar}
        onClose={() => setBorrar(null)}
        titulo={`Quitar “${borrar?.nombre ?? ""}”`}
        descripcion="El usuario dejará de poder ingresar al sistema."
        onConfirm={async () => {
          if (!borrar) return;
          try { await eliminarUsuario(borrar.id); toast.push("success", "Usuario quitado."); refrescar(); }
          catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
        }}
      />
    </div>
  );
}
