import type { Consumo } from "@/core/types";
import { exportExcelTable, stampNombreArchivo } from "@/core/lib/excel";
import { limaWallDate } from "@/core/lib/utils";

export async function exportarConsumosExcel(consumos: Consumo[]) {
  await exportExcelTable({
    filename: `consumos_trabajadores_${stampNombreArchivo()}.xlsx`,
    sheetName: "Consumos",
    tableName: "TablaConsumos",
    columns: [
      { header: "Trabajador",           key: "trabajador", width: 30 },
      { header: "DNI",                  key: "dni",        width: 12 },
      { header: "Producto",             key: "producto",   width: 30 },
      { header: "Unidad",               key: "unidad",     width: 14 },
      { header: "Cantidad",             key: "cantidad",   width: 12, kind: "number" },
      { header: "Precio unitario (S/)", key: "precio",     width: 20, kind: "currency" },
      { header: "Valor total (S/)",     key: "total",      width: 18, kind: "currency" },
      { header: "Fecha de consumo",     key: "fecha",      width: 22, kind: "date" },
    ],
    rows: consumos.map((c) => ({
      trabajador: c.trabajador,
      dni:        c.dni,
      producto:   c.producto,
      unidad:     c.unidad_medida,
      cantidad:   Number(c.cantidad),
      precio:     Number(c.precio_unitario),
      total:      Number(c.total),
      fecha:      limaWallDate(c.fecha_consumo),
    })),
  });
}
