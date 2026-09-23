import { exportExcelTable } from "@/core/lib/excel";
import { listarProductosCompleto } from "@/core/services/productos.service";
import { limaWallDate } from "@/core/lib/utils";

function fmtRango(desde: string | null, hasta: string | null): string {
  const clean = (s: string | null) => (s ?? "").replaceAll("-", "");
  if (desde && hasta) return `${clean(desde)}_al_${clean(hasta)}`;
  if (desde) return `desde_${clean(desde)}`;
  return "todos";
}

export async function exportarProductosExcel(
  rango: { from: string | null; to: string | null }
) {
  const productos = await listarProductosCompleto({ desde: rango.from, hasta: rango.to });

  await exportExcelTable({
    filename: `productos_${fmtRango(rango.from, rango.to)}.xlsx`,
    sheetName: "Productos",
    columns: [
      { header: "Nombre",                          key: "nombre",   width: 34 },
      { header: "Tipo",                            key: "tipo",     width: 22 },
      { header: "Unidad",                          key: "unidad",   width: 14 },
      { header: "Stock actual",                    key: "stock",    width: 14, kind: "number" },
      { header: "Stock total (histórico)",         key: "stockTot", width: 18, kind: "number" },
      { header: "Precio compra (S/)",              key: "pc",       width: 18, kind: "currency" },
      { header: "Precio venta (S/)",               key: "pv",       width: 18, kind: "currency" },
      { header: "% Ganancia",                      key: "pct",      width: 12, kind: "number" },
      { header: "Ganancia unitaria (S/)",          key: "gan",      width: 22, kind: "currency" },
      { header: "Ganancia proyectada total (S/)", key: "ganProy",  width: 26, kind: "currency" },
      { header: "Fecha de registro",               key: "reg",      width: 18, kind: "date-only" },
    ],
    rows: productos.map((p) => {
      const stockTotal = Number(p.stock_total_historico ?? 0);
      const gananciaUnit = Number(p.ganancia_unitaria);
      return {
        nombre:   p.nombre,
        tipo:     p.tipo_producto,
        unidad:   p.unidad_medida ?? "—",
        stock:    Number(p.stock_actual),
        stockTot: stockTotal,
        pc:       Number(p.precio_compra),
        pv:       Number(p.precio_venta),
        pct:      Number(p.porcentaje_ganancia),
        gan:      gananciaUnit,
        ganProy:  Math.round(stockTotal * gananciaUnit * 100) / 100,
        reg:      limaWallDate(p.fecha_creacion),
      };
    }),
  });
}
