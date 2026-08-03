"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Users, Eye, RotateCcw } from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { Card } from "@/presentation/components/ui/Card";
import { Table, Thead, Tr, Th, Td, EmptyState } from "@/presentation/components/ui/Table";
import { useToast } from "@/presentation/components/ui/Toast";
import { eliminarTrabajador, listarDeudasPorTrabajador, listarTrabajadores, reactivarTrabajador } from "@/core/services/trabajadores.service";
import type { Trabajador } from "@/core/types";
import { getErrorMessage, coincideBusqueda, formatDateLima, formatPEN } from "@/core/lib/utils";
import { TrabajadorFormModal } from "./TrabajadorFormModal";
import { TrabajadorDetalleModal } from "./TrabajadorDetalleModal";
import { ConfirmarEliminarModal } from "@/presentation/modules/productos/ConfirmarEliminarModal";

export function TrabajadoresPage() {
  const toast = useToast();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [texto, setTexto] = useState("");
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Trabajador | null>(null);
  const [detalle, setDetalle] = useState<Trabajador | null>(null);
  const [borrar, setBorrar] = useState<Trabajador | null>(null);
  const [deudaBorrar, setDeudaBorrar] = useState<number>(0);
  const [reactivarT, setReactivarT] = useState<Trabajador | null>(null);

  useEffect(() => {
    if (!borrar) { setDeudaBorrar(0); return; }
    listarDeudasPorTrabajador()
      .then((ds) => {
        const d = ds.find((x) => x.id_trabajador === borrar.id);
        setDeudaBorrar(d ? Number(d.total_deuda) : 0);
      })
      .catch(() => setDeudaBorrar(0));
  }, [borrar]);

  const refrescar = useCallback(async () => {
    try { setTrabajadores(await listarTrabajadores(null, mostrarEliminados ? 0 : 1)); }
    catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
  }, [mostrarEliminados, toast]);

  useEffect(() => { refrescar(); }, [refrescar]);

  const filtrados = useMemo(() => {
    if (!texto) return trabajadores;
    return trabajadores.filter((t) =>
      coincideBusqueda(t.nombres, texto) ||
      coincideBusqueda(t.apellidos, texto) ||
      coincideBusqueda(t.dni, texto) ||
      coincideBusqueda(t.labor, texto));
  }, [trabajadores, texto]);

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <AuroraText>Trabajadores</AuroraText>
          </h1>
          <p className="text-sm text-foreground/60 mt-1 hidden sm:block">
            Registra a tus trabajadores. Sus consumos se administran desde el módulo Productos.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button variant="success" onClick={() => { setEditando(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1.5 text-xs font-semibold">
        <Users className="h-3.5 w-3.5 text-[color:var(--primary)]" />
        <span>{mostrarEliminados ? "Eliminados" : "Total activos"}: <span className="font-bold">{trabajadores.length}</span></span>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <Input label="Buscar" placeholder="Nombre, apellido, DNI o labor…"
              value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarEliminados}
              onChange={(e) => setMostrarEliminados(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            <span className="text-xs font-semibold">Mostrar eliminados</span>
          </label>
        </div>
      </Card>

      {filtrados.length === 0 ? (
        <Card><EmptyState text={mostrarEliminados ? "No hay trabajadores eliminados." : "Aún no hay trabajadores."} /></Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Apellidos</Th><Th>Nombres</Th><Th>DNI</Th><Th>Labor</Th><Th>Registrado</Th>
                  <Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <tbody>
                {filtrados.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-semibold">{t.apellidos}</Td>
                    <Td>{t.nombres}</Td>
                    <Td className="text-foreground/80">{t.dni}</Td>
                    <Td>
                      {t.labor ? (
                        <span className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-2 py-0.5 text-xs font-semibold">
                          {t.labor}
                        </span>
                      ) : <span className="text-foreground/40">—</span>}
                    </Td>
                    <Td className="text-foreground/70">{formatDateLima(t.fecha_creacion)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="primary" onClick={() => setDetalle(t)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {mostrarEliminados ? (
                          <Button size="sm" variant="success" onClick={() => setReactivarT(t)} title="Reactivar">
                            <RotateCcw className="h-4 w-4" /> Reactivar
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="warning" onClick={() => { setEditando(t); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setBorrar(t)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filtrados.map((t) => {
              const iniciales = (t.nombres[0] ?? "") + (t.apellidos[0] ?? "");
              return (
                <Card key={t.id} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--primary)] text-white font-bold shrink-0">
                      {iniciales.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{t.apellidos}, {t.nombres}</p>
                      <p className="text-xs text-foreground/60">DNI {t.dni}</p>
                    </div>
                  </div>
                  {t.labor ? (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-2 py-0.5 text-xs font-semibold w-fit">
                      {t.labor}
                    </span>
                  ) : null}
                  <p className="text-[11px] text-foreground/60">Registrado: {formatDateLima(t.fecha_creacion)}</p>
                  <div className={`grid ${mostrarEliminados ? "grid-cols-2" : "grid-cols-3"} gap-1.5`}>
                    <Button size="sm" variant="primary" onClick={() => setDetalle(t)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {mostrarEliminados ? (
                      <Button size="sm" variant="success" onClick={() => setReactivarT(t)}>
                        <RotateCcw className="h-4 w-4" /> Reactivar
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="warning" onClick={() => { setEditando(t); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setBorrar(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <TrabajadorFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={refrescar} trabajador={editando}
      />
      <TrabajadorDetalleModal
        open={!!detalle} onClose={() => setDetalle(null)} trabajador={detalle}
      />
      <ConfirmarEliminarModal
        open={!!borrar}
        onClose={() => setBorrar(null)}
        titulo={`Quitar “${borrar?.apellidos ?? ""}, ${borrar?.nombres ?? ""}”`}
        descripcion={
          deudaBorrar > 0
            ? `⚠️ Este trabajador tiene una deuda pendiente de ${formatPEN(deudaBorrar)}. Primero registra su pago o revierte esos consumos; el sistema no permite quitarlo mientras tenga deuda.`
            : "El trabajador dejará de aparecer en el listado."
        }
        onConfirm={async () => {
          if (!borrar) return;
          try { await eliminarTrabajador(borrar.id); toast.push("success", "Trabajador quitado."); refrescar(); }
          catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
        }}
      />
      <ConfirmarEliminarModal
        open={!!reactivarT}
        onClose={() => setReactivarT(null)}
        titulo={`Reactivar “${reactivarT?.apellidos ?? ""}, ${reactivarT?.nombres ?? ""}”`}
        descripcion="El trabajador volverá a aparecer en los listados activos."
        onConfirm={async () => {
          if (!reactivarT) return;
          try { await reactivarTrabajador(reactivarT.id); toast.push("success", "Trabajador reactivado."); refrescar(); }
          catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
        }}
      />
    </div>
  );
}
