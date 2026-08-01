"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { SearchSelect } from "@/presentation/components/ui/SearchSelect";
import { useToast } from "@/presentation/components/ui/Toast";
import {
  listarConsumos, listarDeudasPorTrabajador, registrarPago,
} from "@/core/services/trabajadores.service";
import type { Consumo, DeudaTrabajador, MetodoPago } from "@/core/types";
import { getErrorMessage, formatDateLima, formatPEN } from "@/core/lib/utils";

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo",          label: "Efectivo" },
  { value: "yape",              label: "Yape" },
  { value: "deposito",          label: "Depósito" },
  { value: "descuento_salario", label: "Descuento de salario" },
];

export function PagoFormModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [deudas, setDeudas] = useState<DeudaTrabajador[]>([]);
  const [idTrab, setIdTrab] = useState<number | "">("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [pendientes, setPendientes] = useState<Consumo[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [loadingLista, setLoadingLista] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdTrab(""); setMetodo("efectivo"); setPendientes([]); setSeleccionados(new Set());
    listarDeudasPorTrabajador().then(setDeudas).catch(() => setDeudas([]));
  }, [open]);

  useEffect(() => {
    if (!idTrab) { setPendientes([]); setSeleccionados(new Set()); return; }
    setLoadingLista(true);
    listarConsumos({ idTrabajador: Number(idTrab), soloPendientes: 1, metodoPago: "credito" })
      .then((data) => {
        setPendientes(data);
        // Por defecto todos seleccionados
        setSeleccionados(new Set(data.map((d) => d.id)));
      })
      .catch(() => setPendientes([]))
      .finally(() => setLoadingLista(false));
  }, [idTrab]);

  const totalSel = useMemo(
    () => pendientes.filter((p) => seleccionados.has(p.id)).reduce((a, p) => a + Number(p.total), 0),
    [pendientes, seleccionados]
  );

  function toggleTodos() {
    if (seleccionados.size === pendientes.length) setSeleccionados(new Set());
    else setSeleccionados(new Set(pendientes.map((p) => p.id)));
  }
  function toggle(id: number) {
    const s = new Set(seleccionados);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSeleccionados(s);
  }

  async function submit() {
    if (!idTrab) return toast.push("error", "Selecciona un trabajador.");
    if (seleccionados.size === 0) return toast.push("error", "Selecciona al menos un consumo a pagar.");

    setSaving(true);
    try {
      await registrarPago({
        id_trabajador: Number(idTrab),
        metodo_pago: metodo,
        ids_consumos: Array.from(seleccionados),
      });
      toast.push("success", `Pago registrado por ${formatPEN(totalSel)}.`);
      onSaved(); onClose();
    } catch (e) {
      toast.push("error", getErrorMessage(e, "Error"));
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago de crédito"
      description="Selecciona al trabajador, marca los consumos a pagar y el método usado."
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button
            variant="success" loading={saving} onClick={submit}
            disabled={seleccionados.size === 0}
          >
            Registrar pago{seleccionados.size > 0 ? ` — ${formatPEN(totalSel)}` : ""}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SearchSelect
          label="Trabajador con deudas" required
          value={idTrab}
          onChange={(v) => setIdTrab(v === "" ? "" : Number(v))}
          options={deudas.map((d) => ({
            value: d.id_trabajador,
            label: d.trabajador,
            hint: `${d.registros} deuda(s) · ${formatPEN(d.total_deuda)}`,
          }))}
          placeholder={deudas.length === 0 ? "No hay trabajadores con deuda" : "Selecciona…"}
          searchPlaceholder="Buscar…"
        />
        <SearchSelect
          label="Método de pago" required clearable={false}
          value={metodo}
          onChange={(v) => setMetodo(v as MetodoPago)}
          options={METODOS}
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">Consumos pendientes</h3>
          {pendientes.length > 0 && (
            <button
              onClick={toggleTodos}
              className="text-xs font-semibold text-[color:var(--primary)] hover:underline"
            >
              {seleccionados.size === pendientes.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          )}
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] max-h-[320px] overflow-y-auto">
          {!idTrab ? (
            <p className="py-10 text-center text-sm text-foreground/60">Selecciona un trabajador para ver sus deudas.</p>
          ) : loadingLista ? (
            <p className="py-10 text-center text-sm text-foreground/60">Cargando deudas…</p>
          ) : pendientes.length === 0 ? (
            <p className="py-10 text-center text-sm text-foreground/60">Este trabajador no tiene deudas pendientes.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {pendientes.map((c) => {
                const checked = seleccionados.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-foreground/[0.03]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 accent-[color:var(--primary)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.producto}</p>
                        <p className="text-[11px] text-foreground/60">
                          {formatDateLima(c.fecha_consumo, true)} · {Number(c.cantidad)} {c.unidad_medida} × {formatPEN(c.precio_unitario)}
                        </p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{formatPEN(c.total)}</p>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {pendientes.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-foreground/60">{seleccionados.size} de {pendientes.length} seleccionados</span>
            <span className="font-black text-lg">Total: {formatPEN(totalSel)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
