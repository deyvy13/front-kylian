"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { DateRangeFilter, type DateRange } from "@/presentation/components/ui/DateRangeFilter";
import { useToast } from "@/presentation/components/ui/Toast";
import { historicoProducto, listarMovimientos, revertirIngreso } from "@/core/services/productos.service";
import type { HistoricoProducto, Movimiento, Producto } from "@/core/types";
import { getErrorMessage, formatDateLima, formatPEN } from "@/core/lib/utils";
import { ArrowDownRight, ArrowUpRight, Package, Percent, Coins, Layers, PackagePlus, ShoppingCart, TrendingUp, Undo2 } from "lucide-react";

export function ProductoDetalleModal({
  open, onClose, producto,
}: { open: boolean; onClose: () => void; producto: Producto | null }) {
  const toast = useToast();
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [historico, setHistorico] = useState<HistoricoProducto | null>(null);
  const [loading, setLoading] = useState(false);
  const [rango, setRango] = useState<DateRange>({ from: null, to: null });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!open || !producto) return;
    setLoading(true);
    Promise.all([
      listarMovimientos({ idProducto: producto.id, desde: rango.from, hasta: rango.to }),
      historicoProducto(producto.id),
    ]).then(([m, h]) => { setMovs(m); setHistorico(h); })
      .finally(() => setLoading(false));
  }, [open, producto, rango.from, rango.to, reloadTick]);

  async function handleRevertirIngreso(id: number) {
    if (!confirm("¿Anular este ingreso? El stock del producto se ajustará.")) return;
    try {
      await revertirIngreso(id);
      toast.push("success", "Ingreso anulado.");
      setReloadTick((t) => t + 1);
    } catch (e) {
      toast.push("error", getErrorMessage(e, "Error al anular"));
    }
  }

  useEffect(() => {
    if (!open) setRango({ from: null, to: null });
  }, [open]);

  if (!producto) return null;

  const kpis = [
    { icon: <Layers className="h-4 w-4" />, label: "Stock actual", value: `${producto.stock_actual} ${producto.unidad_medida}` },
    { icon: <Coins className="h-4 w-4" />, label: "Precio compra", value: formatPEN(producto.precio_compra) },
    { icon: <Coins className="h-4 w-4" />, label: "Precio venta", value: formatPEN(producto.precio_venta) },
    { icon: <Percent className="h-4 w-4" />, label: "% ganancia", value: `${Number(producto.porcentaje_ganancia).toFixed(2)}%` },
    { icon: <Coins className="h-4 w-4" />, label: "Ganancia unitaria", value: formatPEN(producto.ganancia_unitaria) },
    { icon: <Package className="h-4 w-4" />, label: "Tipo", value: producto.tipo_producto },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={producto.nombre}
      description={`Registrado el ${formatDateLima(producto.fecha_creacion, true)}`}
      size="lg"
      footer={<Button variant="danger" onClick={onClose}>Cerrar</Button>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
              {k.icon}{k.label}
            </div>
            <p className="mt-1 text-base font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Histórico acumulado */}
      <div className="mt-5">
        <h3 className="text-sm font-bold mb-2">Histórico acumulado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
              <PackagePlus className="h-4 w-4" />Stock ingresado
            </div>
            <p className="mt-1 text-base font-bold">
              {historico ? Number(historico.total_ingresado).toLocaleString("es-PE") : "…"}
              <span className="text-xs font-normal text-foreground/60"> {producto.unidad_medida}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
              <ShoppingCart className="h-4 w-4" />Stock vendido
            </div>
            <p className="mt-1 text-base font-bold">
              {historico ? Number(historico.total_vendido).toLocaleString("es-PE") : "…"}
              <span className="text-xs font-normal text-foreground/60"> {producto.unidad_medida}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
              <Coins className="h-4 w-4" />Inversión total
            </div>
            <p className="mt-1 text-base font-bold">{historico ? formatPEN(historico.inversion_total) : "…"}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <div className="flex items-center gap-2 text-foreground/60 text-[11px] uppercase tracking-wider font-semibold">
              <TrendingUp className="h-4 w-4" />Ganancia total
            </div>
            <p className="mt-1 text-base font-bold text-[color:var(--success)]">
              {historico ? formatPEN(historico.ganancia_total) : "…"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-bold">Historial de movimientos</h3>
            <p className="text-xs text-foreground/60">Entradas y salidas del producto.</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeFilter value={rango} onApply={setRango} align="right" />
            <span className="text-xs text-foreground/60">{movs.length} registros</span>
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-foreground/60">Cargando…</div>
          ) : movs.length === 0 ? (
            <div className="py-8 text-center text-sm text-foreground/60">Sin movimientos en el rango.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-foreground/60 sticky top-0 bg-[color:var(--surface-2)]">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">P. Unit.</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} className="border-t border-[color:var(--border)]">
                    <td className="px-3 py-2">{formatDateLima(m.fecha_movimiento, true)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.tipo_movimiento === 1
                          ? "bg-[color:var(--success)]/15 text-[color:var(--success)]"
                          : "bg-[color:var(--warning)]/15 text-[color:var(--warning)]"
                      }`}>
                        {m.tipo_movimiento === 1
                          ? <><ArrowDownRight className="h-3 w-3" /> Entrada</>
                          : <><ArrowUpRight className="h-3 w-3" /> Salida</>}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold">{Number(m.cantidad)}</td>
                    <td className="px-3 py-2">{formatPEN(m.precio_unitario)}</td>
                    <td className="px-3 py-2 text-foreground/70">{m.motivo ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {m.tipo_movimiento === 1 ? (
                        <Button size="sm" variant="warning" onClick={() => handleRevertirIngreso(m.id)}
                          title="Anular ingreso">
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : <span className="text-foreground/40 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}
