import { Link } from "@tanstack/react-router";
import { Globe } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="GlobeSIM Startseite" className={cn("font-display text-[22px] font-semibold tracking-[-0.02em] leading-none", className)}>
      <span className="text-ink">Globe</span>
      <span className="text-primary">SIM</span>
    </Link>
  );
}

export function Flag({ code, size = 32, className }: { code: string | null | undefined; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (!code || code.length !== 2) {
    return (
      <span aria-hidden className={cn("flag-round inline-flex items-center justify-center bg-muted text-primary", className)} style={style}>
        <Globe size={Math.round(size * 0.62)} weight="regular" />
      </span>
    );
  }
  return <span aria-hidden className={cn("fi fis flag-round", `fi-${code.toLowerCase()}`, className)} style={style} />;
}

export function Chip({ children, tone = "default", className }: { children: React.ReactNode; tone?: "default" | "active" | "warning" | "muted"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        tone === "default" && "border-line-strong text-ink",
        tone === "muted" && "border-line text-ink-muted",
        tone === "warning" && "border-warning text-warning",
        tone === "active" && "border-line-strong text-ink",
        className,
      )}
    >
      {tone === "active" && <span aria-hidden className="size-1.5 rounded-full bg-mint" />}
      {children}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
      <p className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, code, onRetry }: { message: string; code?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-line border-l-4 border-l-danger bg-surface p-4">
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-3 flex items-center gap-4">
        {onRetry && (
          <button onClick={onRetry} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Erneut versuchen
          </button>
        )}
        {code && <span className="text-xs text-ink-muted">Code: {code}</span>}
      </div>
    </div>
  );
}

export function FixtureBadge() {
  return <Chip tone="warning">Testdaten</Chip>;
}
