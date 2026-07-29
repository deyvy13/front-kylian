import ExcelJS from "exceljs";

export type ColumnDef = {
  header: string;
  key: string;
  width?: number;
  /** "text" (default) | "number" | "currency" | "date" */
  kind?: "text" | "number" | "currency" | "date";
};

const HEADER_FILL = "FF0056D6"; // azul primary
const STRIPE_FILL = "FFEFF4FC"; // azul muy claro para zebra
const BORDER_COLOR = "FFD9E2F3";

/**
 * Genera un .xlsx con tabla nativa (cabecera azul, filtros, zebra).
 * Se descarga automáticamente en el navegador.
 */
export async function exportExcelTable(opts: {
  filename: string;
  sheetName: string;
  tableName: string;
  columns: ColumnDef[];
  rows: Array<Record<string, unknown>>;
}) {
  const { filename, sheetName, tableName, columns, rows } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kylian José";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));

  // Agrega filas
  rows.forEach((r) => ws.addRow(r));

  // Formato numérico / moneda / fecha por columna
  columns.forEach((c, idx) => {
    const col = ws.getColumn(idx + 1);
    if (c.kind === "currency") col.numFmt = '"S/" #,##0.00';
    else if (c.kind === "number") col.numFmt = "#,##0.##";
    else if (c.kind === "date") col.numFmt = "dd/mm/yyyy hh:mm";
  });

  // Tabla nativa
  const lastRow = ws.rowCount;
  const lastColLetter = colLetter(columns.length);
  const ref = `A1:${lastColLetter}${Math.max(lastRow, 2)}`;

  // Estilo manual — más control que el theme built-in
  const header = ws.getRow(1);
  header.height = 26;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top:    { style: "thin", color: { argb: HEADER_FILL } },
      bottom: { style: "thin", color: { argb: HEADER_FILL } },
      left:   { style: "thin", color: { argb: HEADER_FILL } },
      right:  { style: "thin", color: { argb: HEADER_FILL } },
    };
  });

  // Filas (zebra + bordes suaves)
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const zebra = r % 2 === 0;
    row.eachCell((cell) => {
      cell.font = { size: 11 };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        top:    { style: "thin", color: { argb: BORDER_COLOR } },
        bottom: { style: "thin", color: { argb: BORDER_COLOR } },
        left:   { style: "thin", color: { argb: BORDER_COLOR } },
        right:  { style: "thin", color: { argb: BORDER_COLOR } },
      };
      if (zebra) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE_FILL } };
      }
    });
  }

  // Filtros
  ws.autoFilter = ref;

  // Guardar como blob y descargar
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // Silencia lint: tableName no se usa como Excel table (usamos autoFilter),
  // pero lo mantenemos por si luego se agrega addTable.
  void tableName;
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Timestamp corto para nombres de archivo. */
export function stampNombreArchivo(): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).replace(/\//g, "-");
}
