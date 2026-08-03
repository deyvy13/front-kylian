"use client";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { SearchSelect } from "@/presentation/components/ui/SearchSelect";
import { useToast } from "@/presentation/components/ui/Toast";
import { actualizarProducto, crearProducto } from "@/core/services/productos.service";
import type { OpcionLista, Producto } from "@/core/types";
import { getErrorMessage, formatPEN } from "@/core/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  tipos: OpcionLista[];
  unidades: OpcionLista[];
  producto?: Producto | null;
};

type ModoPrecio = "porcentaje" | "directo";

export function ProductoFormModal({ open, onClose, onSaved, tipos, unidades, producto }: Props) {
  const toast = useToast();
  const isEdit = !!producto;
  const [nombre, setNombre] = useState("");
  const [idTipo, setIdTipo] = useState<number | "">("");
  const [idUnidad, setIdUnidad] = useState<number | "">("");
  const [precioCompra, setPrecioCompra] = useState<string>("");
  const [modo, setModo] = useState<ModoPrecio>("porcentaje");
  const [porcentaje, setPorcentaje] = useState<string>("");
  const [precioVenta, setPrecioVenta] = useState<string>("");
  const [stockInicial, setStockInicial] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (producto) {
      setNombre(producto.nombre);
      setIdTipo(producto.id_tipo_producto);
      setIdUnidad(producto.id_unidad_medida);
      setPrecioCompra(String(producto.precio_compra));
      setPorcentaje(String(producto.porcentaje_ganancia));
      setPrecioVenta(String(producto.precio_venta));
      setStockInicial("");
      setModo("porcentaje");
    } else {
      setNombre(""); setIdTipo(""); setIdUnidad("");
      setPrecioCompra(""); setPorcentaje(""); setPrecioVenta("");
      setStockInicial(""); setModo("porcentaje");
    }
  }, [open, producto]);

  // Recalcular precio de venta / % de ganancia según modo
  const pcNum = Number(precioCompra) || 0;
  const gananciaUnitaria = useMemo(() => {
    const pv = Number(precioVenta) || 0;
    if (pcNum <= 0 || pv <= 0) return 0;
    return Math.max(0, pv - pcNum);
  }, [precioVenta, pcNum]);

  function handlePorcentajeChange(v: string) {
    setPorcentaje(v);
    const pct = Number(v);
    if (pcNum > 0 && !Number.isNaN(pct)) {
      setPrecioVenta((pcNum * (1 + pct / 100)).toFixed(2));
    }
  }
  function handlePrecioVentaChange(v: string) {
    setPrecioVenta(v);
    const pv = Number(v);
    if (pcNum > 0 && !Number.isNaN(pv)) {
      setPorcentaje((((pv - pcNum) / pcNum) * 100).toFixed(2));
    }
  }
  function handlePrecioCompraChange(v: string) {
    setPrecioCompra(v);
    const pc = Number(v);
    if (!Number.isNaN(pc) && pc > 0) {
      if (modo === "porcentaje" && porcentaje) {
        setPrecioVenta((pc * (1 + Number(porcentaje) / 100)).toFixed(2));
      } else if (modo === "directo" && precioVenta) {
        setPorcentaje((((Number(precioVenta) - pc) / pc) * 100).toFixed(2));
      }
    }
  }

  async function submit() {
    if (!nombre.trim()) return toast.push("error", "Ingresa el nombre del producto.");
    if (!idTipo) return toast.push("error", "Selecciona el tipo de producto.");
    if (pcNum <= 0) return toast.push("error", "El precio de compra debe ser mayor a 0.");
    if (Number(precioVenta) <= 0) return toast.push("error", "El precio de venta debe ser mayor a 0.");

    setSaving(true);
    try {
      if (isEdit && producto) {
        await actualizarProducto(producto.id, {
          nombre: nombre.trim(),
          id_tipo_producto: Number(idTipo),
          id_unidad_medida: idUnidad === "" ? (null as unknown as number) : Number(idUnidad),
          precio_compra: pcNum,
          precio_venta: Number(precioVenta),
          porcentaje_ganancia: Number(porcentaje) || 0,
        });
        toast.push("success", "Producto actualizado.");
      } else {
        await crearProducto({
          nombre: nombre.trim(),
          id_tipo_producto: Number(idTipo),
          id_unidad_medida: idUnidad === "" ? (null as unknown as number) : Number(idUnidad),
          precio_compra: pcNum,
          precio_venta: Number(precioVenta),
          porcentaje_ganancia: Number(porcentaje) || 0,
          stock_inicial: Number(stockInicial) || 0,
        });
        toast.push("success", "Producto creado.");
      }
      onSaved(); onClose();
    } catch (e) {
      const msg = getErrorMessage(e, "Error al guardar");
      toast.push("error", msg);
    } finally { setSaving(false); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar producto" : "Nuevo producto"}
      description="Los campos que tienen asterisco rojo son obligatorios."
      size="lg"
      footer={
        <>
          <Button variant="danger" onClick={onClose}>Cancelar</Button>
          <Button variant="success" loading={saving} onClick={submit}>
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Nombre del producto"
            required titleCase
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Arroz Costeño 5kg"
          />
        </div>
        <SearchSelect
          label="Tipo de producto" required
          value={idTipo}
          onChange={(v) => setIdTipo(v === "" ? "" : Number(v))}
          options={tipos.map((t) => ({ value: t.id, label: t.nombre }))}
        />
        <SearchSelect
          label="Unidad de medida"
          value={idUnidad}
          onChange={(v) => setIdUnidad(v === "" ? "" : Number(v))}
          options={unidades.map((u) => ({ value: u.id, label: u.nombre }))}
          placeholder="Selecciona (opcional)…"
        />

        <Input
          label="Precio de compra (S/)"
          required
          type="number" min="0" step="0.5" inputMode="decimal"
          value={precioCompra}
          onChange={(e) => handlePrecioCompraChange(e.target.value)}
        />

        <div className="sm:col-span-2">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={modo === "porcentaje"} onChange={() => setModo("porcentaje")} />
                Definir por % de ganancia
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={modo === "directo"} onChange={() => setModo("directo")} />
                Ingresar precio de venta
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="% de ganancia"
                required={modo === "porcentaje"}
                type="number" min="0" step="0.01" inputMode="decimal"
                value={porcentaje}
                disabled={modo !== "porcentaje"}
                onChange={(e) => handlePorcentajeChange(e.target.value)}
              />
              <Input
                label="Precio de venta (S/)"
                required={modo === "directo"}
                type="number" min="0" step="0.01" inputMode="decimal"
                value={precioVenta}
                disabled={modo !== "directo"}
                onChange={(e) => handlePrecioVentaChange(e.target.value)}
              />
            </div>
            <p className="text-xs text-foreground/70">
              Ganancia por unidad: <span className="font-bold">{formatPEN(gananciaUnitaria)}</span>
            </p>
          </div>
        </div>

        {!isEdit && (
          <Input
            label="Cantidad / stock inicial"
            type="number" min="0" step="0.01" inputMode="decimal"
            value={stockInicial}
            onChange={(e) => setStockInicial(e.target.value)}
          />
        )}
      </div>
    </Modal>
  );
}
