"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/presentation/components/ui/Modal";
import { Button } from "@/presentation/components/ui/Button";
import { listarMovimientos } from "@/core/services/productos.service";
import type { Movimiento, Producto } from "@/core/types";
import { formatDateLima, formatPEN } from "@/core/lib/utils";
import { ArrowDownRight, ArrowUpRight, Package, Percent, Coins, Layers } from "lucide-react";

export function ProductoDetalleModal({
  open, onClose, producto,
}: { open: boolean; onClose: () => void; producto: Producto | null }) {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !producto) return;
    setLoading(true);
    listarMovimientos({ idProducto: producto.id })
      .then(setMovs).finally(() => setLoading(false));
  }, [open, producto]);

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

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">Historial de movimientos</h3>
          <span className="text-xs text-foreground/60">{movs.length} registros</span>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-1 max-h-[320px] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-foreground/60">Cargando…</div>
          ) : movs.length === 0 ? (
            <div className="py-8 text-center text-sm text-foreground/60">Sin movimientos aún.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-foreground/60">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cantidad</th>
                  <th className="px-3 py-2">P. Unit.</th>
                  <th className="px-3 py-2">Motivo</th>
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
