"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Legend,
} from "recharts";
import { Package, Layers, Coins, TrendingUp, ArrowDownRight, ArrowUpRight, ClipboardList, AlertCircle, Wallet, ShoppingCart } from "lucide-react";
import { AuroraText } from "@/presentation/components/ui/AuroraText";
import { Card, StatCard } from "@/presentation/components/ui/Card";
import { DateRangeFilter, rangePresets, type DateRange } from "@/presentation/components/ui/DateRangeFilter";
import { ModuleTabs, type ModuleTab } from "@/presentation/components/ui/ModuleTabs";
import { cn, getErrorMessage, formatDateLima, formatPEN } from "@/core/lib/utils";
import { dashboardResumen, historicoGlobal } from "@/core/services/productos.service";
import { listarConsumos, listarDeudasPorTrabajador } from "@/core/services/trabajadores.service";
import type { Consumo, DashboardResumen, DeudaTrabajador, MetodoConsumo } from "@/core/types";
import { LABEL_METODO } from "@/presentation/modules/productos/metodoUi";
import { useToast } from "@/presentation/components/ui/Toast";

type Preset = "hoy" | "7d" | "30d" | "custom";

const MODULOS: ModuleTab[] = [
  { value: "productos", label: "Productos", icon: Package },
  { value: "consumos",  label: "Consumos",  icon: ClipboardList },
];

function PresetChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3.5 rounded-xl text-xs font-semibold transition",
        active
          ? "bg-gradient-to-b from-[color:var(--primary)] to-[#0056d6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_10px_rgba(0,108,255,0.30)]"
          : "bg-[color:var(--surface)] text-foreground/70 border border-[color:var(--border)] hover:bg-[color:var(--primary)]/10 hover:text-[color:var(--primary)]"
      )}
    >
      {children}
    </button>
  );
}

export function DashboardPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "consumos" ? "consumos" : "productos";
  const setTab = (v: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (v === "productos") p.delete("tab"); else p.set("tab", v);
    const qs = p.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  };

  const [rango, setRango] = useState<DateRange>(rangePresets.ultimos30());
  const [preset, setPreset] = useState<Preset>("30d");

  function aplicarPreset(p: Preset) {
    setPreset(p);
    if (p === "hoy") setRango(rangePresets.hoy());
    else if (p === "7d") setRango(rangePresets.ultimos7());
    else if (p === "30d") setRango(rangePresets.ultimos30());
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <AuroraText>Dashboard</AuroraText>
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Elige el módulo a mostrar y el rango de fechas aplica a todos los gráficos.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <PresetChip active={preset === "hoy"}  onClick={() => aplicarPreset("hoy")}>Hoy</PresetChip>
          <PresetChip active={preset === "7d"}   onClick={() => aplicarPreset("7d")}>7 días</PresetChip>
          <PresetChip active={preset === "30d"}  onClick={() => aplicarPreset("30d")}>30 días</PresetChip>
          <DateRangeFilter
            value={rango}
            onApply={(r) => { setRango(r); setPreset("custom"); }}
            align="right"
          />
        </div>
      </div>

      {/* Tabs de módulos — isla flotante centrada */}
      <div className="flex justify-center">
        <ModuleTabs tabs={MODULOS} value={tab} onChange={setTab} />
      </div>

      {tab === "productos" && <DashboardProductos rango={rango} onError={(m) => toast.push("error", m)} />}
      {tab === "consumos"  && <DashboardConsumos  rango={rango} onError={(m) => toast.push("error", m)} />}
    </div>
  );
}

/* ---------------- Productos ---------------- */
function DashboardProductos({ rango, onError }: { rango: DateRange; onError: (m: string) => void }) {
  const [data, setData] = useState<DashboardResumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dashboardResumen(rango.from, rango.to)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => onError(getErrorMessage(e, "Error al cargar dashboard")))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango.from, rango.to]);

  const serie = useMemo(() =>
    (data?.serie ?? []).map((r) => ({ ...r, fecha: formatDateLima(r.fecha).slice(0, 5) })), [data]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Productos" value={loading ? "…" : (data?.kpis.total_productos ?? 0)}
          icon={<Package className="h-4 w-4" />} accent="primary" />
        <StatCard label="Stock total" value={loading ? "…" : Number(data?.kpis.stock_total ?? 0).toLocaleString("es-PE")}
          icon={<Layers className="h-4 w-4" />} accent="success" />
        <StatCard label="Valor inventario" value={loading ? "…" : formatPEN(data?.kpis.valor_inventario ?? 0)}
          icon={<Coins className="h-4 w-4" />} accent="warning" />
        <StatCard label="Ganancia estimada" value={loading ? "…" : formatPEN(data?.kpis.ganancia_estimada ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />} accent="success"
          hint="En las fechas seleccionadas" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Entradas" value={loading ? "…" : Number(data?.kpis.entradas ?? 0).toLocaleString("es-PE")}
          icon={<ArrowDownRight className="h-4 w-4" />} accent="success" />
        <StatCard label="Salidas" value={loading ? "…" : Number(data?.kpis.salidas ?? 0).toLocaleString("es-PE")}
          icon={<ArrowUpRight className="h-4 w-4" />} accent="warning" />
      </div>

      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-bold">Movimientos por día</h2>
          <p className="text-xs text-foreground/60">
            {data ? `${formatDateLima(data.rango.desde)} — ${formatDateLima(data.rango.hasta)}` : ""}
          </p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--success)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gSalidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--warning)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, fontSize: 12,
              }} />
              <Area type="monotone" dataKey="entradas" name="Entradas"
                stroke="var(--success)" strokeWidth={2} fill="url(#gEntradas)" />
              <Area type="monotone" dataKey="salidas" name="Salidas"
                stroke="var(--warning)" strokeWidth={2} fill="url(#gSalidas)" />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-bold">Productos por tipo</h2>
          <p className="text-xs text-foreground/60">Cantidad de productos activos por categoría.</p>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.por_tipo ?? []} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="tipo" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, fontSize: 12,
              }} />
              <Bar dataKey="productos" name="Productos" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}


/* ---------------- Consumos ---------------- */
function DashboardConsumos({ rango, onError }: { rango: DateRange; onError: (m: string) => void }) {
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [deudas, setDeudas] = useState<DeudaTrabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const deudaGlobal = useMemo(() => deudas.reduce((a, d) => a + Number(d.total_deuda), 0), [deudas]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listarConsumos({ desde: rango.from, hasta: rango.to })
      .then((d) => { if (alive) setConsumos(d); })
      .catch((e) => onError(getErrorMessage(e, "Error al cargar consumos")))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango.from, rango.to]);

  // Deudas GLOBALES (no dependen del rango): suma todas las deudas activas
  useEffect(() => {
    let alive = true;
    listarDeudasPorTrabajador()
      .then((ds) => { if (alive) setDeudas(ds); })
      .catch(() => { if (alive) setDeudas([]); });
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const registros = consumos.length;
    const valor     = consumos.reduce((a, c) => a + Number(c.total), 0);
    const cantidad  = consumos.reduce((a, c) => a + Number(c.cantidad), 0);
    return { registros, valor, cantidad };
  }, [consumos]);

  // Serie diaria: total consumido por día
  const serie = useMemo(() => {
    const map = new Map<string, { fecha: string; total: number; credito: number }>();
    consumos.forEach((c) => {
      const key = c.fecha_consumo.slice(0, 10);
      const cur = map.get(key) ?? { fecha: key, total: 0, credito: 0 };
      cur.total += Number(c.total);
      if (c.metodo_pago === "credito") cur.credito += Number(c.total);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((r) => ({ ...r, fecha: formatDateLima(r.fecha).slice(0, 5) }));
  }, [consumos]);

  // Bar chart: valor por método de pago
  const porMetodo = useMemo(() => {
    const acc: Record<MetodoConsumo, number> = { credito: 0, efectivo: 0, yape: 0, deposito: 0 };
    consumos.forEach((c) => { acc[c.metodo_pago] += Number(c.total); });
    return (Object.keys(acc) as MetodoConsumo[]).map((m) => ({
      metodo: LABEL_METODO[m], valor: acc[m],
    }));
  }, [consumos]);

  // Top trabajadores por deuda pendiente — usa las deudas globales, no las del rango
  const topDeuda = useMemo(() =>
    deudas.slice(0, 6).map((d) => ({
      trabajador: d.trabajador,
      deuda: Number(d.total_deuda),
      activo: d.activo === 1,
    })),
  [deudas]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Registros"        value={loading ? "…" : kpis.registros}
          icon={<ClipboardList className="h-4 w-4" />} accent="primary" />
        <StatCard label="Cantidad total"   value={loading ? "…" : kpis.cantidad.toLocaleString("es-PE")}
          icon={<ShoppingCart className="h-4 w-4" />} accent="warning" />
        <StatCard label="Valor consumido"  value={loading ? "…" : formatPEN(kpis.valor)}
          icon={<Coins className="h-4 w-4" />} accent="success" />
        <StatCard label="Deuda pendiente (total)" value={formatPEN(deudaGlobal)}
          icon={<AlertCircle className="h-4 w-4" />} accent="danger"
          hint="Todas las deudas activas (no depende del rango)" />
      </div>

      <Card>
        <div className="mb-3">
          <h2 className="text-sm font-bold">Consumo por día</h2>
          <p className="text-xs text-foreground/60">Total consumido y porción a crédito.</p>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gCredito" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--warning)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.12} vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 12, fontSize: 12,
              }} formatter={(v) => formatPEN(Number(v))} />
              <Area type="monotone" dataKey="total"   name="Total consumido"
                stroke="var(--primary)" strokeWidth={2} fill="url(#gTotal)" />
              <Area type="monotone" dataKey="credito" name="A crédito"
                stroke="var(--warning)" strokeWidth={2} fill="url(#gCredito)" />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <div className="mb-3">
            <h2 className="text-sm font-bold">Consumo por método de pago</h2>
            <p className="text-xs text-foreground/60">Valor total agrupado por forma de pago.</p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMetodo} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="metodo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 12, fontSize: 12,
                }} formatter={(v) => formatPEN(Number(v))} />
                <Bar dataKey="valor" name="Valor" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-[color:var(--warning)]" />
            <h2 className="text-sm font-bold">Top deudas pendientes</h2>
          </div>
          {topDeuda.length === 0 ? (
            <p className="py-10 text-center text-sm text-foreground/60">
              Sin créditos pendientes en el rango.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {topDeuda.map((d) => (
                <li key={d.trabajador} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold truncate">
                    {d.trabajador}
                    {!d.activo && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-foreground/10 text-foreground/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Inactivo
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold text-[color:var(--danger)] shrink-0">
                    {formatPEN(d.deuda)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
