"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FileSpreadsheet, Receipt, Coins, Calendar } from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { Card, StatCard } from "@/presentation/components/ui/Card";
import { Table, Thead, Tr, Th, Td, EmptyState } from "@/presentation/components/ui/Table";
import { DateRangeFilter, type DateRange } from "@/presentation/components/ui/DateRangeFilter";
import { ExportarRangoModal } from "@/presentation/components/ui/ExportarRangoModal";
import { useToast } from "@/presentation/components/ui/Toast";
import { eliminarGasto, listarGastosPaginado } from "@/core/services/gastos.service";
import { Pagination } from "@/presentation/components/ui/Pagination";
import type { Gasto } from "@/core/types";
import { getErrorMessage, coincideBusqueda, formatDateLima, formatPEN } from "@/core/lib/utils";
import { GastoFormModal } from "./GastoFormModal";
import { ConfirmarEliminarModal } from "@/presentation/modules/productos/ConfirmarEliminarModal";
import { exportarGastosExcel } from "./exportar";

export function GastosPage() {
  const toast = useToast();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [rango, setRango] = useState<DateRange>({ from: null, to: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [borrar, setBorrar] = useState<Gasto | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const refrescar = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total: t } = await listarGastosPaginado({
        desde: rango.from, hasta: rango.to,
        texto: texto || null,
        limit: pageSize, offset: (page - 1) * pageSize,
      });
      setGastos(rows);
      setTotal(t);
    }
    catch (e) { toast.push("error", getErrorMessage(e, "Error al cargar gastos")); }
    finally { setLoading(false); }
  }, [rango.from, rango.to, texto, page, pageSize, toast]);

  useEffect(() => { setPage(1); }, [rango.from, rango.to, texto, pageSize]);
  useEffect(() => { refrescar(); }, [refrescar]);

  const filtrados = gastos;
  // Suma solo de la página cargada. Para el total en soles global usar tarjeta aparte.
  const totalMontoPagina = useMemo(() => filtrados.reduce((a, g) => a + Number(g.monto), 0), [filtrados]);

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <AuroraText>Gastos</AuroraText>
          </h1>
          <p className="text-sm text-foreground/60 mt-1 hidden sm:block">
            Registra los egresos de la bodega para controlar la rentabilidad.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Button variant="primary" onClick={() => setExportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar</span>
          </Button>
          <Button variant="success" onClick={() => { setEditando(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Buscar" placeholder="Concepto…"
            value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground/70">Rango de fechas</span>
            <DateRangeFilter value={rango} onApply={setRango} className="w-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Gastos registrados" value={total}
          icon={<Receipt className="h-4 w-4" />} accent="primary"
          hint="Total del filtro (todas las páginas)" />
        <StatCard label="Total en esta página" value={formatPEN(totalMontoPagina)}
          icon={<Coins className="h-4 w-4" />} accent="danger"
          hint={`${filtrados.length} de ${total} registro(s)`} />
      </div>

      {loading ? (
        <Card><p className="py-8 text-center text-foreground/60">Cargando…</p></Card>
      ) : filtrados.length === 0 ? (
        <>
          <Card><EmptyState text="Sin gastos en este filtro." /></Card>
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Fecha</Th><Th>Concepto</Th><Th>Monto</Th>
                  <Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <tbody>
                {filtrados.map((g) => (
                  <Tr key={g.id}>
                    <Td className="text-foreground/70">{formatDateLima(g.fecha_gasto)}</Td>
                    <Td className="font-semibold">{g.concepto}</Td>
                    <Td className="font-bold text-[color:var(--danger)]">{formatPEN(g.monto)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="warning" onClick={() => { setEditando(g); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setBorrar(g)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Fichas móvil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filtrados.map((g) => (
              <Card key={g.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{g.concepto}</p>
                    <p className="text-xs text-foreground/60 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDateLima(g.fecha_gasto)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[color:var(--danger)] shrink-0">
                    {formatPEN(g.monto)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="warning" onClick={() => { setEditando(g); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setBorrar(g)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage} onPageSizeChange={setPageSize} />
        </>
      )}

      <GastoFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={refrescar} gasto={editando}
      />
      <ConfirmarEliminarModal
        open={!!borrar}
        onClose={() => setBorrar(null)}
        titulo={`Quitar gasto de ${borrar ? formatPEN(borrar.monto) : ""}`}
        descripcion="El gasto dejará de aparecer en el listado y en los cálculos financieros."
        onConfirm={async () => {
          if (!borrar) return;
          try { await eliminarGasto(borrar.id); toast.push("success", "Gasto quitado."); refrescar(); }
          catch (e) { toast.push("error", getErrorMessage(e, "Error")); }
        }}
      />
      <ExportarRangoModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        titulo="Exportar gastos"
        descripcion="Elige el rango de fechas de los gastos a incluir."
        onConfirm={(r) => exportarGastosExcel(r)}
      />
    </div>
  );
}
