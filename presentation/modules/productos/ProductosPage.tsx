"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Eye, Pencil, Trash2, FileSpreadsheet, PackagePlus,
  Package, Layers, Coins, TrendingUp, ClipboardList, Undo2, ShoppingCart,
  Wallet, AlertCircle,
} from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { Button } from "@/presentation/components/ui/Button";
import { Input } from "@/presentation/components/ui/Input";
import { SearchSelect } from "@/presentation/components/ui/SearchSelect";
import { Card, StatCard } from "@/presentation/components/ui/Card";
import { Table, Thead, Tr, Th, Td, EmptyState } from "@/presentation/components/ui/Table";
import { DateRangeFilter, type DateRange } from "@/presentation/components/ui/DateRangeFilter";
import { ModuleTabs, type ModuleTab } from "@/presentation/components/ui/ModuleTabs";
import { useToast } from "@/presentation/components/ui/Toast";
import { eliminarProducto, listarProductos } from "@/core/services/productos.service";
import { listarConsumos, listarTrabajadores, revertirConsumo } from "@/core/services/trabajadores.service";
import type { MetodoConsumo } from "@/core/types";
import { LABEL_METODO, CHIP_METODO } from "./metodoUi";
import { PagoFormModal } from "./PagoFormModal";
import { listarOpciones } from "@/core/services/listas.service";
import type { Consumo, OpcionLista, Producto, Trabajador } from "@/core/types";
import { coincideBusqueda, formatPEN, formatDateLima } from "@/core/lib/utils";
import { exportarProductosExcel } from "./exportar";
import { exportarConsumosExcel } from "./exportar_consumos";
import { ProductoFormModal } from "./ProductoFormModal";
import { ProductoDetalleModal } from "./ProductoDetalleModal";
import { ConsumoFormModal } from "./ConsumoFormModal";
import { ConfirmarEliminarModal } from "./ConfirmarEliminarModal";
import { IngresoStockModal } from "./IngresoStockModal";

const TABS: ModuleTab[] = [
  { value: "productos", label: "Productos", icon: Package },
  { value: "consumos",  label: "Consumos",  icon: ClipboardList },
];

export function ProductosPage() {
  const [tab, setTab] = useState("productos");

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <AuroraText>Productos</AuroraText>
          </h1>
          <p className="text-sm text-foreground/60 mt-1 hidden sm:block">
            Controla el stock de tu bodega y los consumos de tus trabajadores.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <ModuleTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "productos" ? <TabProductos /> : <TabConsumos />}
    </div>
  );
}

/* ================= PRODUCTOS ================= */
function TabProductos() {
  const toast = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tipos, setTipos] = useState<OpcionLista[]>([]);
  const [unidades, setUnidades] = useState<OpcionLista[]>([]);
  const [loading, setLoading] = useState(true);

  const [idTipo, setIdTipo] = useState<number | "">("");
  const [texto, setTexto] = useState("");
  const [rango, setRango] = useState<DateRange>({ from: null, to: null });

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [detalleProd, setDetalleProd] = useState<Producto | null>(null);
  const [borrarProd, setBorrarProd] = useState<Producto | null>(null);
  const [ingresoProd, setIngresoProd] = useState<Producto | null>(null);

  const refrescar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarProductos({
        idTipo: idTipo === "" ? null : idTipo,
        desde: rango.from, hasta: rango.to,
        texto: texto || null,
      });
      setProductos(data);
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Error al cargar productos");
    } finally { setLoading(false); }
  }, [idTipo, rango.from, rango.to, texto, toast]);

  useEffect(() => {
    listarOpciones("TIPOS_PRODUCTO").then(setTipos).catch(() => {});
    listarOpciones("UNIDADES_MEDIDA").then(setUnidades).catch(() => {});
  }, []);

  useEffect(() => { refrescar(); /* eslint-disable-next-line */ }, [idTipo, rango.from, rango.to]);

  const filtrados = useMemo(() => {
    if (!texto) return productos;
    return productos.filter((p) => coincideBusqueda(p.nombre, texto));
  }, [productos, texto]);

  const kpis = useMemo(() => {
    const total = filtrados.length;
    const stock = filtrados.reduce((a, p) => a + Number(p.stock_actual), 0);
    const valorStock = filtrados.reduce((a, p) => a + Number(p.stock_actual) * Number(p.precio_compra), 0);
    const gananciaTotal = filtrados.reduce(
      (a, p) => a + Number(p.stock_actual) * Number(p.ganancia_unitaria),
      0
    );
    return { total, stock, valorStock, gananciaTotal };
  }, [filtrados]);

  return (
    <div className="space-y-5">
      <div className="flex flex-row items-center justify-end gap-2">
        <Button variant="primary" onClick={() => exportarProductosExcel(filtrados)}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
        </Button>
        <Button variant="success" onClick={() => { setEditando(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo producto</span>
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Buscar" placeholder="Nombre del producto…"
            value={texto} onChange={(e) => setTexto(e.target.value)} />
          <SearchSelect
            label="Tipo de producto"
            value={idTipo}
            onChange={(v) => setIdTipo(v === "" ? "" : Number(v))}
            options={tipos.map((t) => ({ value: t.id, label: t.nombre }))}
            placeholder="Todos"
          />
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground/70">Rango de fechas</span>
            <DateRangeFilter value={rango} onApply={setRango} className="w-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Productos" value={kpis.total} icon={<Package className="h-4 w-4" />} accent="primary" />
        <StatCard label="Stock total" value={kpis.stock.toLocaleString("es-PE")} icon={<Layers className="h-4 w-4" />} accent="success" />
        <StatCard label="Valor de Stock" value={formatPEN(kpis.valorStock)} icon={<Coins className="h-4 w-4" />} accent="warning"
          hint="Precio de compra × stock" />
        <StatCard label="Ganancia total del stock" value={formatPEN(kpis.gananciaTotal)} icon={<TrendingUp className="h-4 w-4" />} accent="success"
          hint="Ganancia unitaria × stock" />
      </div>

      {loading ? (
        <Card><p className="py-8 text-center text-foreground/60">Cargando…</p></Card>
      ) : filtrados.length === 0 ? (
        <Card><EmptyState text="No hay productos con esos filtros." /></Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Producto</Th><Th>Tipo</Th><Th>Stock</Th>
                  <Th>P. compra</Th><Th>P. venta</Th><Th>Ganancia</Th>
                  <Th>Registrado</Th><Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <tbody>
                {filtrados.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="font-semibold">{p.nombre}</div>
                      <div className="text-xs text-foreground/60">{p.unidad_medida}</div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-2 py-0.5 text-xs font-semibold">
                        {p.tipo_producto}
                      </span>
                    </Td>
                    <Td className="font-semibold">{Number(p.stock_actual)}</Td>
                    <Td>{formatPEN(p.precio_compra)}</Td>
                    <Td className="font-bold">{formatPEN(p.precio_venta)}</Td>
                    <Td className="text-[color:var(--success)] font-semibold">
                      {formatPEN(p.ganancia_unitaria)}
                      <span className="ml-1 text-xs text-foreground/50">({Number(p.porcentaje_ganancia).toFixed(1)}%)</span>
                    </Td>
                    <Td className="text-foreground/70">{formatDateLima(p.fecha_creacion)}</Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="primary" onClick={() => setDetalleProd(p)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="success" onClick={() => setIngresoProd(p)} title="Registrar ingreso de stock">
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="warning" onClick={() => { setEditando(p); setFormOpen(true); }} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setBorrarProd(p)} title="Quitar">
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
            {filtrados.map((p) => (
              <Card key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{p.nombre}</p>
                    <p className="text-xs text-foreground/60">
                      {p.unidad_medida} · {formatDateLima(p.fecha_creacion)}
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)] px-2 py-0.5 text-[11px] font-semibold">
                    {p.tipo_producto}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">Stock</p>
                    <p className="font-bold">{Number(p.stock_actual)}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">P. venta</p>
                    <p className="font-bold">{formatPEN(p.precio_venta)}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">P. compra</p>
                    <p className="font-bold">{formatPEN(p.precio_compra)}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">Ganancia</p>
                    <p className="font-bold text-[color:var(--success)]">{formatPEN(p.ganancia_unitaria)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <Button size="sm" variant="primary" onClick={() => setDetalleProd(p)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="success" onClick={() => setIngresoProd(p)}>
                    <PackagePlus className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="warning" onClick={() => { setEditando(p); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setBorrarProd(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ProductoFormModal
        open={formOpen} onClose={() => setFormOpen(false)} onSaved={refrescar}
        tipos={tipos} unidades={unidades} producto={editando}
      />
      <ProductoDetalleModal
        open={!!detalleProd} onClose={() => setDetalleProd(null)} producto={detalleProd}
      />
      <IngresoStockModal
        open={!!ingresoProd} onClose={() => setIngresoProd(null)}
        onSaved={refrescar} producto={ingresoProd}
      />
      <ConfirmarEliminarModal
        open={!!borrarProd}
        onClose={() => setBorrarProd(null)}
        titulo={`Quitar “${borrarProd?.nombre ?? ""}”`}
        descripcion="El producto dejará de aparecer en el listado."
        onConfirm={async () => {
          if (!borrarProd) return;
          try { await eliminarProducto(borrarProd.id); toast.push("success", "Producto quitado."); refrescar(); }
          catch (e) { toast.push("error", e instanceof Error ? e.message : "Error"); }
        }}
      />
    </div>
  );
}

/* ================= CONSUMOS ================= */
function TabConsumos() {
  const toast = useToast();
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);

  const [idTrab, setIdTrab] = useState<number | "">("");
  const [rango, setRango] = useState<DateRange>({ from: null, to: null });
  const [metodo, setMetodo] = useState<MetodoConsumo | "">("");
  const [pendientes, setPendientes] = useState<"todos" | "pagados" | "pendientes">("todos");

  const [formOpen, setFormOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [revertir, setRevertir] = useState<Consumo | null>(null);

  useEffect(() => {
    listarTrabajadores().then(setTrabajadores).catch(() => setTrabajadores([]));
  }, []);

  const refrescar = useCallback(async () => {
    setLoading(true);
    try {
      setConsumos(await listarConsumos({
        idTrabajador: idTrab === "" ? null : idTrab,
        desde: rango.from, hasta: rango.to,
        metodoPago: metodo || null,
        soloPendientes: pendientes === "pendientes" ? 1 : pendientes === "pagados" ? 0 : null,
      }));
    } catch (e) { toast.push("error", e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }, [idTrab, rango.from, rango.to, metodo, pendientes, toast]);

  useEffect(() => { refrescar(); }, [refrescar]);

  const totales = useMemo(() => {
    const cantidad = consumos.reduce((a, c) => a + Number(c.cantidad), 0);
    const valor    = consumos.reduce((a, c) => a + Number(c.total), 0);
    const deuda    = consumos.filter((c) => c.metodo_pago === "credito" && c.pagado === 0)
                              .reduce((a, c) => a + Number(c.total), 0);
    return { registros: consumos.length, cantidad, valor, deuda };
  }, [consumos]);

  return (
    <div className="space-y-5">
      <div className="flex flex-row items-center justify-end gap-2 flex-wrap">
        <Button variant="primary" onClick={() => exportarConsumosExcel(consumos)}>
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
        </Button>
        <Button variant="warning" onClick={() => setPagoOpen(true)}>
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar pago</span>
        </Button>
        <Button variant="success" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar consumo</span>
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchSelect
            label="Trabajador"
            value={idTrab}
            onChange={(v) => setIdTrab(v === "" ? "" : Number(v))}
            options={trabajadores.map((t) => ({
              value: t.id, label: `${t.apellidos}, ${t.nombres}`, hint: `DNI ${t.dni}`,
            }))}
            placeholder="Todos"
            searchPlaceholder="Buscar por nombre o DNI…"
          />
          <SearchSelect
            label="Método de pago"
            value={metodo}
            onChange={(v) => setMetodo((v === "" ? "" : v) as MetodoConsumo | "")}
            options={[
              { value: "credito",  label: "Crédito" },
              { value: "efectivo", label: "Efectivo" },
              { value: "yape",     label: "Yape" },
              { value: "deposito", label: "Depósito" },
            ]}
            placeholder="Todos"
          />
          <SearchSelect
            label="Estado" clearable={false}
            value={pendientes}
            onChange={(v) => setPendientes(v as "todos" | "pagados" | "pendientes")}
            options={[
              { value: "todos",       label: "Todos" },
              { value: "pendientes",  label: "Pendientes de pago" },
              { value: "pagados",     label: "Ya pagados" },
            ]}
          />
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground/70">Rango de fechas</span>
            <DateRangeFilter value={rango} onApply={setRango} className="w-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Registros"      value={totales.registros} icon={<ClipboardList className="h-4 w-4" />} accent="primary" />
        <StatCard label="Cantidad total" value={totales.cantidad.toLocaleString("es-PE")} icon={<ShoppingCart className="h-4 w-4" />} accent="warning" />
        <StatCard label="Valor total"    value={formatPEN(totales.valor)} icon={<Coins className="h-4 w-4" />} accent="success" />
        <StatCard label="Deuda pendiente" value={formatPEN(totales.deuda)} icon={<AlertCircle className="h-4 w-4" />} accent="danger"
          hint="Solo créditos sin pagar" />
      </div>

      {loading ? (
        <Card><p className="py-8 text-center text-foreground/60">Cargando…</p></Card>
      ) : consumos.length === 0 ? (
        <Card><EmptyState text="Sin consumos en este filtro." /></Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <Thead>
                <Tr>
                  <Th>Fecha</Th><Th>Trabajador</Th><Th>Producto</Th>
                  <Th>Cantidad</Th><Th>Total</Th>
                  <Th>Método</Th><Th>Estado</Th>
                  <Th className="text-right">Acciones</Th>
                </Tr>
              </Thead>
              <tbody>
                {consumos.map((c) => {
                  const esCredito = c.metodo_pago === "credito";
                  const pendiente = esCredito && c.pagado === 0;
                  return (
                    <Tr key={c.id}>
                      <Td className="text-foreground/70">{formatDateLima(c.fecha_consumo, true)}</Td>
                      <Td>
                        <div className="font-semibold">{c.trabajador}</div>
                        {c.dni ? <div className="text-xs text-foreground/60">DNI {c.dni}</div> : null}
                      </Td>
                      <Td>
                        <div>{c.producto}</div>
                        <div className="text-xs text-foreground/60">{c.unidad_medida}</div>
                      </Td>
                      <Td className="font-semibold">{Number(c.cantidad)}</Td>
                      <Td className="font-bold text-[color:var(--success)]">{formatPEN(c.total)}</Td>
                      <Td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP_METODO[c.metodo_pago]}`}>
                          {LABEL_METODO[c.metodo_pago]}
                        </span>
                      </Td>
                      <Td>
                        {esCredito
                          ? pendiente
                            ? <span className="text-xs font-semibold text-[color:var(--danger)]">Pendiente</span>
                            : <span className="text-xs font-semibold text-[color:var(--success)]">Pagado</span>
                          : <span className="text-xs text-foreground/60">—</span>}
                      </Td>
                      <Td>
                        <div className="flex justify-end">
                          <Button size="sm" variant="warning"
                            onClick={() => setRevertir(c)}
                            disabled={c.id_pago != null}
                            title={c.id_pago != null ? "Ya fue pagado" : "Revertir"}>
                            <Undo2 className="h-4 w-4" /> Revertir
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {consumos.map((c) => {
              const esCredito = c.metodo_pago === "credito";
              const pendiente = esCredito && c.pagado === 0;
              return (
                <Card key={c.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{c.trabajador}</p>
                      <p className="text-xs text-foreground/60">
                        {c.dni ? `DNI ${c.dni} · ` : ""}{formatDateLima(c.fecha_consumo, true)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[color:var(--success)]">{formatPEN(c.total)}</span>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-sm">
                    <p className="font-semibold">{c.producto}</p>
                    <p className="text-xs text-foreground/60">
                      {Number(c.cantidad)} {c.unidad_medida} × {formatPEN(c.precio_unitario)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHIP_METODO[c.metodo_pago]}`}>
                        {LABEL_METODO[c.metodo_pago]}
                      </span>
                      {esCredito && (
                        <span className={`text-[11px] font-semibold ${pendiente ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}`}>
                          {pendiente ? "Pendiente" : "Pagado"}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="warning"
                      onClick={() => setRevertir(c)}
                      disabled={c.id_pago != null}>
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConsumoFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refrescar} />
      <PagoFormModal    open={pagoOpen} onClose={() => setPagoOpen(false)} onSaved={refrescar} />
      <ConfirmarEliminarModal
        open={!!revertir}
        onClose={() => setRevertir(null)}
        titulo="Revertir consumo"
        descripcion="Se eliminará el registro y la cantidad volverá al stock del producto."
        onConfirm={async () => {
          if (!revertir) return;
          try { await revertirConsumo(revertir.id); toast.push("success", "Consumo revertido."); refrescar(); }
          catch (e) { toast.push("error", e instanceof Error ? e.message : "Error"); }
        }}
      />
    </div>
  );
}
