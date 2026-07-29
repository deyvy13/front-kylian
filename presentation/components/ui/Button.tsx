"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/core/lib/utils";

type Variant = "primary" | "success" | "danger" | "warning" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:brightness-110",
  success: "bg-[color:var(--success)] text-[color:var(--success-fg)] hover:brightness-110",
  danger:  "bg-[color:var(--danger)]  text-[color:var(--danger-fg)]  hover:brightness-110",
  warning: "bg-[color:var(--warning)] text-[color:var(--warning-fg)] hover:brightness-110",
  ghost:   "bg-[color:var(--surface-2)] text-foreground hover:bg-foreground/5",
  outline: "bg-[color:var(--surface)]  text-foreground border border-[color:var(--border)] hover:bg-foreground/5",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  clay?: boolean;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", clay: withClay = true, loading, children, disabled, ...props },
  ref
) {
  const isColored = variant !== "ghost" && variant !== "outline";
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold",
        "transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
        sizeClasses[size],
        variantClasses[variant],
        withClay && isColored && "clay-btn",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
