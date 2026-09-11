"use client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/core/lib/utils";

type Props = {
  page: number;                                   // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, total);

  const goto = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages));
    if (next !== currentPage) onPageChange(next);
  };

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
      "rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3",
      className
    )}>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-foreground/60">Mostrando</span>
        <span className="font-bold">{from}–{to}</span>
        <span className="text-foreground/60">de</span>
        <span className="font-bold">{total.toLocaleString("es-PE")}</span>

        <span className="mx-2 text-foreground/30">·</span>

        <label className="flex items-center gap-1.5">
          <span className="text-foreground/60">Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <PagBtn onClick={() => goto(1)} disabled={currentPage === 1} title="Primera">
          <ChevronsLeft className="h-4 w-4" />
        </PagBtn>
        <PagBtn onClick={() => goto(currentPage - 1)} disabled={currentPage === 1} title="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </PagBtn>
        <span className="px-3 py-1.5 text-xs font-semibold text-foreground/80">
          Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
        </span>
        <PagBtn onClick={() => goto(currentPage + 1)} disabled={currentPage >= totalPages} title="Siguiente">
          <ChevronRight className="h-4 w-4" />
        </PagBtn>
        <PagBtn onClick={() => goto(totalPages)} disabled={currentPage >= totalPages} title="Última">
          <ChevronsRight className="h-4 w-4" />
        </PagBtn>
      </div>
    </div>
  );
}

function PagBtn({ children, onClick, disabled, title }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title} type="button"
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg text-foreground/80",
        "border border-[color:var(--border)] bg-[color:var(--surface-2)]",
        "hover:bg-[color:var(--primary)]/10 hover:text-[color:var(--primary)]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[color:var(--surface-2)] disabled:hover:text-foreground/80"
      )}
    >{children}</button>
  );
}
