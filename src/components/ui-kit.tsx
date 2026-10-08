import { forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

export const btnClass = (variant: Variant = "primary", className?: string) =>
  cn(
    "inline-flex h-[52px] lg:h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary-hover",
    variant === "secondary" && "border border-line-strong bg-surface text-ink hover:border-ink-muted",
    variant === "ghost" && "px-3 text-primary hover:bg-muted",
    className,
  );

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }>(
  ({ variant = "primary", loading, className, children, disabled, ...props }, ref) => (
    <button ref={ref} className={btnClass(variant, className)} disabled={disabled || loading} {...props}>
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export function LinkButton({ to, variant = "primary", className, children, ...rest }: { to: string; variant?: Variant; className?: string; children: React.ReactNode; params?: Record<string, string> }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={to as any} params={rest.params as any} className={btnClass(variant, className)}>
      {children}
    </Link>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-14 w-full rounded-md border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus-visible:outline-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function SegmentedControl<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 shrink-0 whitespace-nowrap rounded-[9px] px-3 text-sm font-medium transition-colors duration-150 sm:px-4",
            value === o.value ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
