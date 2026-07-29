import { cn } from "@/core/lib/utils";

export function AuroraText({
  children,
  className,
}: { children: React.ReactNode; className?: string }) {
  return <span className={cn("aurora-text font-black tracking-tight", className)}>{children}</span>;
}
