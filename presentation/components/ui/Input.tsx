"use client";
import { forwardRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn, toTitleCase } from "@/core/lib/utils";

const base =
  "w-full rounded-2xl bg-[color:var(--surface)] text-foreground placeholder:text-foreground/40 " +
  "border border-[color:var(--border)] px-4 h-11 text-sm transition " +
  "focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent " +
  "disabled:opacity-60";

function Label({ label, required }: { label?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <span className="text-xs font-semibold text-foreground/70 inline-flex items-center gap-1">
      {label}
      {required ? <span className="text-[color:var(--danger)] font-bold" aria-label="obligatorio">*</span> : null}
    </span>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  /** Capitaliza automáticamente la primera letra de cada palabra */
  titleCase?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, titleCase, onChange, required, type, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <label className="block space-y-1.5">
      <Label label={label} required={required} />
      <div className="relative">
        <input
          ref={ref}
          type={effectiveType}
          required={required}
          className={cn(
            base,
            isPassword && "pr-11",
            error && "border-[color:var(--danger)] ring-1 ring-[color:var(--danger)]",
            className
          )}
          onChange={(e) => {
            if (titleCase && typeof e.currentTarget.value === "string") {
              const start = e.currentTarget.selectionStart;
              e.currentTarget.value = toTitleCase(e.currentTarget.value);
              if (start != null) {
                try { e.currentTarget.setSelectionRange(start, start); } catch {}
              }
            }
            onChange?.(e);
          }}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <span className="text-xs text-[color:var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-foreground/60">{hint}</span>
      ) : null}
    </label>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string; error?: string; hint?: string;
};
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, hint, error, required, children, ...props },
  ref
) {
  return (
    <label className="block space-y-1.5">
      <Label label={label} required={required} />
      <select
        ref={ref}
        required={required}
        className={cn(base, "pr-9 appearance-none",
          error && "border-[color:var(--danger)] ring-1 ring-[color:var(--danger)]",
          className)}
        {...props}
      >{children}</select>
      {error ? (
        <span className="text-xs text-[color:var(--danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-foreground/60">{hint}</span>
      ) : null}
    </label>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string; error?: string; hint?: string;
};
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, required, ...props }, ref
) {
  return (
    <label className="block space-y-1.5">
      <Label label={label} required={required} />
      <textarea
        ref={ref}
        required={required}
        className={cn(base, "h-24 py-3 resize-none",
          error && "border-[color:var(--danger)] ring-1 ring-[color:var(--danger)]", className)}
        {...props}
      />
      {error ? <span className="text-xs text-[color:var(--danger)]">{error}</span>
        : hint ? <span className="text-xs text-foreground/60">{hint}</span> : null}
    </label>
  );
});
