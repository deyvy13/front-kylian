import type { Producto } from "@/core/types";
import { exportExcelTable, stampNombreArchivo } from "@/core/lib/excel";

export async function exportarProductosExcel(productos: Producto[]) {
  await exportExcelTable({
    filename: `productos_${stampNombreArchivo()}.xlsx`,
    sheetName: "Productos",
    tableName: "TablaProductos",
    columns: [
      { header: "Nombre",                 key: "nombre", width: 34 },
      { header: "Tipo",                   key: "tipo",   width: 22 },
      { header: "Unidad",                 key: "unidad", width: 14 },
      { header: "Stock",                  key: "stock",  width: 10, kind: "number" },
      { header: "Precio compra (S/)",     key: "pc",     width: 18, kind: "currency" },
      { header: "Precio venta (S/)",      key: "pv",     width: 18, kind: "currency" },
      { header: "% Ganancia",             key: "pct",    width: 12, kind: "number" },
      { header: "Ganancia unitaria (S/)", key: "gan",    width: 22, kind: "currency" },
    ],
    rows: productos.map((p) => ({
      nombre: p.nombre,
      tipo:   p.tipo_producto,
      unidad: p.unidad_medida,
      stock:  Number(p.stock_actual),
      pc:     Number(p.precio_compra),
      pv:     Number(p.precio_venta),
      pct:    Number(p.porcentaje_ganancia),
      gan:    Number(p.ganancia_unitaria),
    })),
  });
}
