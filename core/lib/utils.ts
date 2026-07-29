import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normaliza texto para búsqueda: minúsculas, sin tildes, sin diacríticos. */
export function normalizarTexto(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes
    .toLocaleLowerCase("es-PE");
}

/** ¿El texto `hay` contiene a `agu`, ignorando mayúsculas y tildes? */
export function coincideBusqueda(hay: string | null | undefined, agu: string | null | undefined): boolean {
  if (!agu) return true;
  return normalizarTexto(hay).includes(normalizarTexto(agu));
}

/** Capitaliza la primera letra de cada palabra; el resto en minúscula. */
export function toTitleCase(value: string): string {
  return value
    .toLocaleLowerCase("es-PE")
    .replace(/(^|\s|[-–/])(\p{L})/gu, (_m, sep, ch) => sep + ch.toLocaleUpperCase("es-PE"));
}

export const PEN = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function formatPEN(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return PEN.format(Number.isFinite(n as number) ? (n as number) : 0);
}

export function formatDateLima(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

/** Devuelve true si la unidad solo admite cantidades enteras. */
export function esUnidadEntera(unidad: string | null | undefined): boolean {
  if (!unidad) return false;
  const u = unidad.trim().toLocaleLowerCase("es-PE");
  const enteras = ["unidad", "docena", "caja", "botella", "bolsa", "paquete"];
  return enteras.includes(u);
}

/** Convierte un timestamp de Supabase (sin zona, hora Lima) a un Date
 *  cuyos componentes UTC coinciden con la hora Lima. Útil para exportar a
 *  Excel — la celda de fecha no tiene concepto de zona horaria y así se
 *  muestra la hora "de reloj" tal cual la ve el usuario. */
export function limaWallDate(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const s = iso.replace(" ", "T");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(s);
  const [, y, mo, d, h, mi, se] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se ?? 0)));
}

export function toISODateLima(d: Date): string {
  // yyyy-mm-dd en zona Lima
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}
