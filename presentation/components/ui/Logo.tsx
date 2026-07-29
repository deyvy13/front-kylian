import { AuroraText } from "./AuroraText";
import { cn } from "@/core/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className={cn("flex items-center gap-2 font-sans", className)}>
      <div
        aria-hidden
        className="grid h-9 w-9 place-items-center rounded-2xl clay clay-sm text-lg font-black text-[color:var(--primary)]"
      >
        KJ
      </div>
      <div className="leading-tight">
        <AuroraText className={sz}>Kylian José</AuroraText>
        <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/60 font-semibold">
          Gestión
        </p>
      </div>
    </div>
  );
}
