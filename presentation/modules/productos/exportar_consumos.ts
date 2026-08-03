import type { Consumo, MetodoConsumo } from "@/core/types";
import { exportExcelMulti, type ColumnDef } from "@/core/lib/excel";
import { limaWallDate } from "@/core/lib/utils";
import { LABEL_METODO } from "./metodoUi";
import { listarConsumos } from "@/core/services/trabajadores.service";

function fmtRango(desde: string | null, hasta: string | null): string {
  const clean = (s: string | null) => (s ?? "").replaceAll("-", "");
  if (desde && hasta) return `${clean(desde)}_al_${clean(hasta)}`;
  if (desde) return `desde_${clean(desde)}`;
  return "todos";
}

/**
 * Exporta un Excel con cuatro hojas:
 *  1) DETALLE DEUDAS        — solo consumos a crédito pendientes.
 *  2) DEUDAS POR TRABAJADOR — suma deuda activa por trabajador.
 *  3) TOTAL CONSUMOS        — totales por método de pago, con crédito
 *                             separado en pagado y pendiente.
 *  4) DETALLE TOTAL CONSUMOS — por trabajador: fila para crédito y fila
 *                             para consumos regulares (no se cobran).
 */
export async function exportarConsumosExcel(
  rango: { from: string | null; to: string | null }
) {
  // Trae SIEMPRE con el rango elegido en el modal (no usa filtros de pantalla)
  const consumos: Consumo[] = await listarConsumos({
    desde: rango.from, hasta: rango.to,
  });
  const deudas = consumos.filter((c) => c.metodo_pago === "credito" && c.pagado === 0);

  // ------ Hoja 1: DETALLE DEUDAS ------
  const hojaDetalle = deudas.map((c) => ({
    trabajador: c.trabajador + (c.trabajador_activo === 0 ? " (inactivo)" : ""),
    dni:        c.dni ?? "",
    producto:   c.producto + (c.producto_activo === 0 ? " (eliminado)" : ""),
    unidad:     c.unidad_medida ?? "",
    cantidad:   Number(c.cantidad),
    precio:     Number(c.precio_unitario),
    total:      Number(c.total),
    fecha:      limaWallDate(c.fecha_consumo),
  }));

  // ------ Hoja 2: DEUDAS POR TRABAJADOR ------
  const mapDeudas = new Map<string, { trabajador: string; dni: string; registros: number; total: number }>();
  deudas.forEach((c) => {
    const key = c.id_trabajador != null ? `t-${c.id_trabajador}` : `x-${c.trabajador}`;
    const cur = mapDeudas.get(key) ?? {
      trabajador: c.trabajador + (c.trabajador_activo === 0 ? " (inactivo)" : ""),
      dni: c.dni ?? "", registros: 0, total: 0,
    };
    cur.registros += 1;
    cur.total += Number(c.total);
    mapDeudas.set(key, cur);
  });
  const hojaDeudasPorTrab = Array.from(mapDeudas.values()).sort((a, b) => b.total - a.total);

  // ------ Hoja 3: TOTAL CONSUMOS (por método) ------
  const totales: Record<string, number> = {
    efectivo: 0, yape: 0, deposito: 0,
    credito_pagado: 0, credito_pendiente: 0,
  };
  let cantConsumos = { efectivo: 0, yape: 0, deposito: 0, credito_pagado: 0, credito_pendiente: 0 };
  consumos.forEach((c) => {
    if (c.metodo_pago === "credito") {
      if (c.pagado === 1) { totales.credito_pagado += Number(c.total); cantConsumos.credito_pagado++; }
      else                { totales.credito_pendiente += Number(c.total); cantConsumos.credito_pendiente++; }
    } else {
      totales[c.metodo_pago] += Number(c.total);
      cantConsumos[c.metodo_pago as keyof typeof cantConsumos]++;
    }
  });
  const totalGeneral = Object.values(totales).reduce((a, v) => a + v, 0);
  const hojaTotal = [
    { concepto: "Efectivo",                registros: cantConsumos.efectivo,          total: totales.efectivo },
    { concepto: "Yape",                    registros: cantConsumos.yape,              total: totales.yape },
    { concepto: "Depósito",                registros: cantConsumos.deposito,          total: totales.deposito },
    { concepto: "Crédito — Ya pagado",     registros: cantConsumos.credito_pagado,    total: totales.credito_pagado },
    { concepto: "Crédito — Pendiente",     registros: cantConsumos.credito_pendiente, total: totales.credito_pendiente },
    { concepto: "TOTAL GENERAL",           registros: consumos.length,                total: totalGeneral },
  ];

  // ------ Hoja 4: DETALLE TOTAL CONSUMOS (agrupado por trabajador + tipo) ------
  // 1 fila crédito por trabajador (pagado + pendiente); 1 fila consumo regular por trabajador
  type ResumenTrab = {
    trabajador: string; dni: string;
    creditoRegistros: number; creditoPagado: number; creditoPendiente: number;
    regRegistros: number; regTotal: number;
    regMetodos: Set<MetodoConsumo>;
  };
  const map = new Map<string, ResumenTrab>();
  consumos.forEach((c) => {
    const key = c.id_trabajador != null ? `t-${c.id_trabajador}` : `x-${c.trabajador}`;
    const cur = map.get(key) ?? {
      trabajador: c.trabajador + (c.trabajador_activo === 0 ? " (inactivo)" : ""),
      dni: c.dni ?? "",
      creditoRegistros: 0, creditoPagado: 0, creditoPendiente: 0,
      regRegistros: 0, regTotal: 0, regMetodos: new Set<MetodoConsumo>(),
    };
    if (c.metodo_pago === "credito") {
      cur.creditoRegistros++;
      if (c.pagado === 1) cur.creditoPagado += Number(c.total);
      else                cur.creditoPendiente += Number(c.total);
    } else {
      cur.regRegistros++;
      cur.regTotal += Number(c.total);
      cur.regMetodos.add(c.metodo_pago);
    }
    map.set(key, cur);
  });

  const hojaDetalleTotal: Array<Record<string, unknown>> = [];
  Array.from(map.values())
    .sort((a, b) => (b.creditoPendiente + b.creditoPagado + b.regTotal) - (a.creditoPendiente + a.creditoPagado + a.regTotal))
    .forEach((r) => {
      if (r.creditoRegistros > 0) {
        hojaDetalleTotal.push({
          trabajador: r.trabajador,
          dni: r.dni,
          tipo: "Crédito (a cobrar)",
          registros: r.creditoRegistros,
          total_consumido: r.creditoPagado + r.creditoPendiente,
          pagado: r.creditoPagado,
          pendiente: r.creditoPendiente,
          nota: "Ver DETALLE DEUDAS para los ítems pendientes",
        });
      }
      if (r.regRegistros > 0) {
        hojaDetalleTotal.push({
          trabajador: r.trabajador,
          dni: r.dni,
          tipo: "Consumo regular (NO se cobra)",
          registros: r.regRegistros,
          total_consumido: r.regTotal,
          pagado: r.regTotal,
          pendiente: 0,
          nota: `Métodos: ${Array.from(r.regMetodos).map((m) => LABEL_METODO[m]).join(", ")}`,
        });
      }
    });

  const detalleCols: ColumnDef[] = [
    { header: "Trabajador",           key: "trabajador", width: 30 },
    { header: "DNI",                  key: "dni",        width: 12 },
    { header: "Producto",             key: "producto",   width: 30 },
    { header: "Unidad",               key: "unidad",     width: 14 },
    { header: "Cantidad",             key: "cantidad",   width: 12, kind: "number" },
    { header: "Precio unitario (S/)", key: "precio",     width: 20, kind: "currency" },
    { header: "Deuda (S/)",           key: "total",      width: 16, kind: "currency" },
    { header: "Fecha de consumo",     key: "fecha",      width: 22, kind: "date" },
  ];
  const totalPorTrabCols: ColumnDef[] = [
    { header: "Trabajador",       key: "trabajador", width: 32 },
    { header: "DNI",              key: "dni",        width: 12 },
    { header: "Deudas activas",   key: "registros",  width: 16, kind: "number" },
    { header: "Total deuda (S/)", key: "total",      width: 20, kind: "currency" },
  ];
  const totalCols: ColumnDef[] = [
    { header: "Concepto",   key: "concepto",  width: 30 },
    { header: "Registros",  key: "registros", width: 14, kind: "number" },
    { header: "Total (S/)", key: "total",     width: 20, kind: "currency" },
  ];
  const detalleTotalCols: ColumnDef[] = [
    { header: "Trabajador",           key: "trabajador",       width: 30 },
    { header: "DNI",                  key: "dni",              width: 12 },
    { header: "Tipo",                 key: "tipo",             width: 30 },
    { header: "Registros",            key: "registros",        width: 12, kind: "number" },
    { header: "Total consumido (S/)", key: "total_consumido",  width: 20, kind: "currency" },
    { header: "Pagado (S/)",          key: "pagado",           width: 16, kind: "currency" },
    { header: "Pendiente (S/)",       key: "pendiente",        width: 16, kind: "currency" },
    { header: "Nota",                 key: "nota",             width: 40 },
  ];

  await exportExcelMulti({
    filename: `consumos_${fmtRango(rango.from, rango.to)}.xlsx`,
    sheets: [
      { name: "DETALLE DEUDAS",           columns: detalleCols,        rows: hojaDetalle },
      { name: "DEUDAS POR TRABAJADOR",    columns: totalPorTrabCols,   rows: hojaDeudasPorTrab },
      { name: "TOTAL CONSUMOS",           columns: totalCols,          rows: hojaTotal },
      { name: "DETALLE TOTAL CONSUMOS",   columns: detalleTotalCols,   rows: hojaDetalleTotal },
    ],
  });
}
