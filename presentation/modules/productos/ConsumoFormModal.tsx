"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { SearchSelect } from "@/presentation/components/ui/SearchSelect";
import { useToast } from "@/presentation/components/ui/Toast";
import { listarTrabajadores, registrarConsumo } from "@/core/services/trabajadores.service";
import { listarProductos } from "@/core/services/productos.service";
import type { MetodoConsumo, Producto, Trabajador } from "@/core/types";
import { esUnidadEntera, formatPEN } from "@/core/lib/utils";

const METODOS: { value: MetodoConsumo; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "yape",     label: "Yape" },
  { value: "deposito", label: "Depósito" },
  { value: "credito",  label: "Crédito" },
];

export function ConsumoFormModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [idTrab, setIdTrab] = useState<number | "">("");
  const [idProd, setIdProd] = useState<number | "">("");
  const [cantidad, setCantidad] = useState<string>("");
  const [metodo, setMetodo] = useState<MetodoConsumo>("efectivo");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIdTrab(""); setIdProd(""); setCantidad(""); setMetodo("efectivo");
    listarTrabajadores().then(setTrabajadores).catch(() => setTrabajadores([]));
    listarProductos().then(setProductos).catch(() => setProductos([]));
  }, [open]);

  const productoSel = useMemo(() => productos.find((p) => p.id === idProd), [productos, idProd]);
  const entera = useMemo(() => esUnidadEntera(productoSel?.unidad_medida), [productoSel]);
  const cNum = Number(cantidad) || 0;
  const total = productoSel ? cNum * Number(productoSel.precio_venta) : 0;
  const esCredito = metodo === "credito";

  async function submit() {
    if (!idProd) return toast.push("error", "Selecciona el producto.");
    if (cNum <= 0) return toast.push("error", "La cantidad debe ser mayor a 0.");
    if (entera && !Number.isInteger(cNum)) {
      return toast.push("error", `La unidad "${productoSel!.unidad_medida}" solo admite cantidades enteras.`);
    }
    if (productoSel && cNum > Number(productoSel.stock_actual)) {
      return toast.push("error", `Stock insuficiente. Disponible: ${productoSel.stock_actual}`);
    }
    if (esCredito && !idTrab) {
      return toast.push("error", "Para un consumo a crédito debes seleccionar al trabajador.");
    }

    setSaving(true);
    try {
      await registrarConsumo({
        id_trabajador: idTrab === "" ? null : Number(idTrab),
        id_producto:   Number(idProd),
        cantidad:      cNum,
        metodo_pago:   metodo,
      });
      toast.push("success", esCredito ? "Consumo registrado como deuda." : "Consumo registrado.");
      onSaved(); onClose();
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar consumo"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>Registrar consumo</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SearchSelect
          label={esCredito ? "Trabajador" : "Trabajador (opcional)"}
          required={esCredito}
          value={idTrab}
          onChange={(v) => setIdTrab(v === "" ? "" : Number(v))}
          options={trabajadores.map((t) => ({
            value: t.id,
            label: `${t.apellidos}, ${t.nombres}`,
            hint: `DNI ${t.dni}`,
          }))}
          placeholder="— sin trabajador —"
          searchPlaceholder="Buscar por nombre o DNI…"
        />
        <SearchSelect
          label="Método de pago" required clearable={false}
          value={metodo}
          onChange={(v) => setMetodo(v as MetodoConsumo)}
          options={METODOS}
        />
        <SearchSelect
          label="Producto" required
          value={idProd}
          onChange={(v) => setIdProd(v === "" ? "" : Number(v))}
          options={productos.map((p) => ({
            value: p.id,
            label: p.nombre,
            hint: `stock ${Number(p.stock_actual)} · ${formatPEN(p.precio_venta)}`,
          }))}
          searchPlaceholder="Buscar producto…"
        />
        <Input
          label={`Cantidad ${productoSel ? `(${productoSel.unidad_medida})` : ""}`}
          required
          type="number"
          min={entera ? "1" : "0"}
          step={entera ? "1" : "0.01"}
          inputMode={entera ? "numeric" : "decimal"}
          value={cantidad}
          onChange={(e) => {
            const v = e.target.value;
            setCantidad(entera ? v.replace(/[.,]\d*/g, "") : v);
          }}
          hint={entera ? "Solo cantidades enteras." : undefined}
        />
        <div className="sm:col-span-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">
              {esCredito ? "Se registrará como deuda" : "Total a cobrar"}
            </p>
            <p className="text-xl font-black">{formatPEN(total)}</p>
          </div>
          {esCredito ? (
            <span className="text-xs font-semibold text-[color:var(--warning)] bg-[color:var(--warning)]/12 px-2 py-1 rounded-full">
              Crédito
            </span>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
