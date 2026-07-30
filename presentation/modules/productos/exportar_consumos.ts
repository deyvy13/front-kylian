import type { Consumo } from "@/core/types";
import { exportExcelMulti, stampNombreArchivo } from "@/core/lib/excel";
import { limaWallDate } from "@/core/lib/utils";

/**
 * Exporta un Excel con DOS hojas:
 *  1) "DETALLE DEUDAS"     — solo consumos a crédito pendientes de pago.
 *  2) "TOTAL POR TRABAJADOR" — deuda activa agrupada por trabajador.
 */
export async function exportarConsumosExcel(consumos: Consumo[]) {
  const deudas = consumos.filter((c) => c.metodo_pago === "credito" && c.pagado === 0);

  // Agrupar por trabajador
  const map = new Map<string, {
    id: number | null; trabajador: string; dni: string | null;
    registros: number; total: number;
  }>();
  deudas.forEach((c) => {
    const key = c.id_trabajador != null ? `t-${c.id_trabajador}` : `x-${c.trabajador}`;
    const cur = map.get(key) ?? {
      id: c.id_trabajador, trabajador: c.trabajador, dni: c.dni,
      registros: 0, total: 0,
    };
    cur.registros += 1;
    cur.total += Number(c.total);
    map.set(key, cur);
  });
  const totales = Array.from(map.values()).sort((a, b) => b.total - a.total);

  await exportExcelMulti({
    filename: `deudas_trabajadores_${stampNombreArchivo()}.xlsx`,
    sheets: [
      {
        name: "DETALLE DEUDAS",
        columns: [
          { header: "Trabajador",           key: "trabajador", width: 30 },
          { header: "DNI",                  key: "dni",        width: 12 },
          { header: "Producto",             key: "producto",   width: 30 },
          { header: "Unidad",               key: "unidad",     width: 14 },
          { header: "Cantidad",             key: "cantidad",   width: 12, kind: "number" },
          { header: "Precio unitario (S/)", key: "precio",     width: 20, kind: "currency" },
          { header: "Deuda (S/)",           key: "total",      width: 16, kind: "currency" },
          { header: "Fecha de consumo",     key: "fecha",      width: 22, kind: "date" },
        ],
        rows: deudas.map((c) => ({
          trabajador: c.trabajador,
          dni:        c.dni ?? "",
          producto:   c.producto,
          unidad:     c.unidad_medida,
          cantidad:   Number(c.cantidad),
          precio:     Number(c.precio_unitario),
          total:      Number(c.total),
          fecha:      limaWallDate(c.fecha_consumo),
        })),
      },
      {
        name: "TOTAL POR TRABAJADOR",
        columns: [
          { header: "Trabajador",       key: "trabajador", width: 32 },
          { header: "DNI",              key: "dni",        width: 12 },
          { header: "Deudas activas",   key: "registros",  width: 16, kind: "number" },
          { header: "Total deuda (S/)", key: "total",      width: 20, kind: "currency" },
        ],
        rows: totales.map((t) => ({
          trabajador: t.trabajador,
          dni:        t.dni ?? "",
          registros:  t.registros,
          total:      t.total,
        })),
      },
    ],
  });
}
