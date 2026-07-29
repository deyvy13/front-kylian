import { cn } from "@/core/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}
export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-left text-[11px] uppercase tracking-wider text-foreground/60">
      {children}
    </thead>
  );
}
export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-3 font-semibold", className)}>{children}</th>;
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-t border-[color:var(--border)] hover:bg-foreground/[0.03]", className)}>{children}</tr>;
}
export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3 align-middle", className)}>{children}</td>;
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-14 text-center text-sm text-foreground/60">{text}</div>
  );
}
