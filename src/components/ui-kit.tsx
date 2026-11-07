import { forwardRef } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

// ui-kit keeps its public API (primary/secondary/ghost, loading, LinkButton, btnClass) and renders
// through the single button system in ui/button.tsx. md = 48px, sm = 40px, lg = 56px (hero, checkout).
const VARIANT_MAP = { primary: "default", secondary: "secondary", ghost: "quiet" } as const;
const SIZE_MAP = { sm: "sm", md: "default", lg: "lg" } as const;

export const btnClass = (variant: Variant = "primary", className?: string, size: Size = "md") =>
  cn(buttonVariants({ variant: VARIANT_MAP[variant], size: SIZE_MAP[size] }), className);

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => (
    <button ref={ref} className={btnClass(variant, className, size)} disabled={disabled || loading} {...props}>
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export function LinkButton({ to, variant = "primary", size = "md", className, children, ...rest }: { to: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode; params?: Record<string, string> }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={to as any} params={rest.params as any} className={btnClass(variant, className, size)}>
      {children}
    </Link>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-14 w-full rounded-md border border-line-control bg-surface px-4 text-base text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-(--dur-hover) ease-ui-out hover:border-ink-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger",
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
            "h-10 shrink-0 whitespace-nowrap rounded-[9px] px-3 text-sm font-medium transition-colors duration-(--dur-hover) ease-ui-out sm:px-4",
            value === o.value ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
