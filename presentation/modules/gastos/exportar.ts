import { exportExcelTable } from "@/core/lib/excel";
import { listarGastos } from "@/core/services/gastos.service";
import { limaWallDate } from "@/core/lib/utils";

function fmtRango(desde: string | null, hasta: string | null): string {
  const clean = (s: string | null) => (s ?? "").replaceAll("-", "");
  if (desde && hasta) return `${clean(desde)}_al_${clean(hasta)}`;
  if (desde) return `desde_${clean(desde)}`;
  return "todos";
}

export async function exportarGastosExcel(
  rango: { from: string | null; to: string | null }
) {
  const gastos = await listarGastos({ desde: rango.from, hasta: rango.to });

  await exportExcelTable({
    filename: `gastos_${fmtRango(rango.from, rango.to)}.xlsx`,
    sheetName: "Gastos",
    columns: [
      { header: "Fecha del gasto", key: "fecha",    width: 16, kind: "date-only" },
      { header: "Concepto",        key: "concepto", width: 40 },
      { header: "Monto (S/)",      key: "monto",    width: 16, kind: "currency" },
      { header: "Registrado",      key: "reg",      width: 22, kind: "date" },
    ],
    rows: gastos.map((g) => ({
      fecha:    limaWallDate(g.fecha_gasto),
      concepto: g.concepto,
      monto:    Number(g.monto),
      reg:      limaWallDate(g.fecha_creacion),
    })),
  });
}
