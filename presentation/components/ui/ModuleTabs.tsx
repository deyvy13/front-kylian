"use client";
import { cn } from "@/core/lib/utils";
import type { ComponentType } from "react";

export type ModuleTab = {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

export function ModuleTabs({
  tabs, value, onChange, className,
}: {
  tabs: ModuleTab[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      style={{ backgroundColor: "var(--surface)" }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] p-1",
        "shadow-[0_6px_20px_rgba(15,32,68,0.08)]",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-semibold transition",
              active
                ? "bg-gradient-to-b from-[color:var(--primary)] to-[#0056d6] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_10px_rgba(0,108,255,0.35)]"
                : "text-foreground/70 hover:bg-[color:var(--primary)]/10 hover:text-[color:var(--primary)]"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
