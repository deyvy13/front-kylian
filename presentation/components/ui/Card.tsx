import { cn } from "@/core/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("clay p-4 sm:p-6", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  accent = "primary",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "danger" | "warning";
  icon?: React.ReactNode;
}) {
  const accentBg = {
    primary: "bg-[color:var(--primary)]/12 text-[color:var(--primary)]",
    success: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
    danger:  "bg-[color:var(--danger)]/12  text-[color:var(--danger)]",
    warning: "bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
  }[accent];
  return (
    <Card className="flex items-start justify-between gap-2 sm:gap-3 p-3 sm:p-6">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-foreground/60 font-semibold truncate">
          {label}
        </p>
        <p className="mt-1 text-base sm:text-2xl font-bold tracking-tight truncate leading-tight">
          {value}
        </p>
        {hint ? <p className="mt-1 text-[11px] sm:text-xs text-foreground/60 truncate">{hint}</p> : null}
      </div>
      {icon ? (
        <div className={cn("grid h-7 w-7 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl shrink-0", accentBg)}>
          {icon}
        </div>
      ) : null}
    </Card>
  );
}
