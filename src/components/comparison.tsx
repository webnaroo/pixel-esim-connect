import { useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Minus, X } from "@phosphor-icons/react";
import { comparisonQuery } from "@/lib/comparison.functions";
import type { CellStatus, ViewCompetitor, ViewRow } from "@/lib/comparison";
import { FixtureBadge } from "@/components/brand";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const STATUS_LABEL: Record<CellStatus, string> = { check: "Ja", neutral: "Eingeschränkt oder abweichend", cross: "Nein" };

function StatusIcon({ status }: { status: CellStatus }) {
  const cls = "mt-0.5 shrink-0";
  const icon = status === "check" ? <Check size={18} weight="bold" className={cn(cls, "text-success")} aria-hidden /> : status === "cross" ? <X size={18} weight="bold" className={cn(cls, "text-ink-muted")} aria-hidden /> : <Minus size={18} weight="bold" className={cn(cls, "text-ink-muted")} aria-hidden />;
  return <>{icon}<span className="sr-only">{STATUS_LABEL[status]}: </span></>;
}

export function SourceLink({ href, checkedAt }: { href: string; checkedAt: string }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-[48px] items-center font-medium text-primary underline underline-offset-2 sm:min-h-0">Quelle</a>
      <span>geprüft {fmtDate(checkedAt)}</span>
    </p>
  );
}

export function CompetitorName({ c }: { c: Pick<ViewCompetitor, "name" | "logoUrl"> }) {
  return c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="h-5 w-auto max-w-[96px] object-contain" /> : <span className="truncate text-base font-semibold">{c.name}</span>;
}

export function CompetitorPicker({ items, value, onChange }: { items: ViewCompetitor[]; value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = items.findIndex((i) => i.id === value);
  function onKey(e: React.KeyboardEvent) {
    let n = idx;
    if (e.key === "ArrowRight") n = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") n = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[n].id);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label="Vergleichsanbieter wählen" onKeyDown={onKey} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((c, i) => (
        <button
          key={c.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          id={`cmp-tab-${c.id}`}
          aria-selected={c.id === value}
          aria-controls="cmp-panel"
          tabIndex={c.id === value ? 0 : -1}
          onClick={() => onChange(c.id)}
          className={cn("min-h-[48px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium", c.id === value ? "border-primary bg-primary text-primary-foreground" : "border-line-strong text-ink")}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function ComparisonRow({ row, competitor }: { row: ViewRow; competitor: string }) {
  const cell = "rounded-[14px] border p-3 sm:p-4 text-sm text-ink";
  return (
    <li className="py-4">
      <h3 className="text-sm font-semibold text-ink-muted">{row.question}</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
        <li className={cn(cell, "border-primary")} aria-label={`GlobeSIM: ${row.globesim.text}`}>
          <div className="flex gap-2"><StatusIcon status={row.globesim.status} /><span className="line-clamp-3">{row.globesim.text}</span></div>
        </li>
        <li className={cn(cell, "border-line")} aria-label={`${competitor}: ${row.other.text}`}>
          <div className="flex gap-2"><StatusIcon status={row.other.status} /><span className="line-clamp-3">{row.other.text}</span></div>
          <SourceLink href={row.other.sourceUrl} checkedAt={row.other.checkedAt} />
        </li>
      </ul>
    </li>
  );
}

export function ComparisonSection() {
  const { data, isLoading } = useQuery(comparisonQuery());
  const [sel, setSel] = useState<string | null>(null);
  const hid = useId();
  if (isLoading) return <section className="container-page max-w-[880px] py-16" aria-hidden><div className="h-8 w-64 animate-pulse rounded bg-muted" /><div className="mt-6 h-40 animate-pulse rounded-[14px] bg-muted" /></section>;
  const view = data?.view;
  if (!view) return null;
  const current = view.competitors.find((c) => c.id === sel) ?? view.competitors[0];

  function focusSearch() {
    const input = document.querySelector<HTMLInputElement>("[data-hero-search] input");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  }

  return (
    <section className="container-page max-w-[880px] py-16 lg:py-24" aria-labelledby={hid}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={hid}>GlobeSIM im Vergleich</h2>
        {data.fixture && <FixtureBadge />}
      </div>
      <p className="mt-2 text-sm text-ink-muted">Öffentliche Angaben der Anbieter, Stand: {fmtDate(view.latestCheckedAt)}.</p>
      <div className="mt-6"><CompetitorPicker items={view.competitors} value={current.id} onChange={setSel} /></div>
      <div id="cmp-panel" role="tabpanel" aria-labelledby={`cmp-tab-${current.id}`} className="mt-4">
        <div className="sticky top-14 z-10 grid grid-cols-2 gap-2 border-b border-line bg-paper py-3 sm:gap-3 lg:static">
          <span className="px-3 font-display text-lg font-semibold tracking-[-0.02em]"><span className="text-ink">Globe</span><span className="text-primary">SIM</span></span>
          <span className="flex min-w-0 items-center px-3"><CompetitorName c={current} /></span>
        </div>
        <ul className="divide-y divide-line">
          {current.rows.map((r) => <ComparisonRow key={r.id} row={r} competitor={current.name} />)}
        </ul>
      </div>
      <p className="mt-6 text-xs text-ink-muted">
        Alle Angaben stammen aus öffentlich zugänglichen Quellen der jeweiligen Anbieter und wurden am angegebenen Datum geprüft. Änderungen vorbehalten. Marken- und Produktnamen gehören den jeweiligen Inhabern. GlobeSIM steht in keiner Verbindung zu diesen Anbietern.{" "}
        <Link to="/help" search={{ subject: "Vergleich: Korrektur" }} className="font-medium text-primary underline underline-offset-2">Fehler melden</Link>
      </p>
      <button type="button" onClick={focusSearch} className="mt-8 inline-flex min-h-[48px] items-center rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary-hover">Reiseziel suchen</button>
    </section>
  );
}
