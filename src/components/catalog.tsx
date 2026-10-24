import { Link } from "@tanstack/react-router";
import { CaretRight, Check } from "@phosphor-icons/react";
import { Flag, Chip } from "./brand";
import { formatData, formatDays, formatPrice } from "@/lib/format";
import type { PlanItem } from "@/lib/catalog.functions";
import { cn } from "@/lib/utils";

export function DestinationRow({ d }: { d: { type: string; slug: string; name: string; flagCode: string | null; fromPrice: number | null } }) {
  const isCountry = d.type === "country";
  return (
    <Link
      to={isCountry ? "/countries/$slug" : "/regions/$slug"}
      params={{ slug: d.slug }}
      className="flex min-h-16 min-w-0 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors duration-150 hover:border-line-strong sm:gap-4"
    >
      <Flag code={isCountry ? d.flagCode : null} size={32} />
      <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">{d.name}</span>
      {d.fromPrice != null && <span className="shrink-0 whitespace-nowrap tabular text-sm font-semibold text-ink">ab {formatPrice(d.fromPrice)}</span>}
      <CaretRight aria-hidden size={18} className="shrink-0 text-ink-muted" />
    </Link>
  );
}

export function DestinationRowSkeleton() {
  return <div className="h-16 animate-pulse rounded-lg border border-line bg-surface" />;
}

import { UnlimitedLabel, UnlimitedNote } from "./unlimited-claim";
import { showsNoThrottle } from "@/lib/throttle";

export function PlanCard(props: { plan: PlanItem; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  if (!showsNoThrottle(props.plan)) return <PlanCardButton {...props} />;
  return (
    <div className="flex flex-col gap-1">
      <PlanCardButton {...props} />
      <div className="px-1"><UnlimitedNote throttleClaim={props.plan.throttleClaim} /></div>
    </div>
  );
}

function PlanCardButton({ plan, selected, onSelect, disabled }: { plan: PlanItem; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  const perUnit =
    plan.type === "data" && plan.dataMb && plan.dataMb >= 1024
      ? `${formatPrice(plan.price / (plan.dataMb / 1024))} pro GB`
      : plan.type === "unlimited"
        ? `${formatPrice(plan.price / plan.validityDays)} pro Tag`
        : null;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[72px] w-full flex-col gap-2 rounded-lg bg-surface p-4 text-left transition-colors duration-150 disabled:opacity-50",
        selected ? "border-2 border-primary p-[15px]" : "border border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {plan.type === "unlimited" ? <UnlimitedLabel stacked throttleClaim={plan.throttleClaim} className="font-display text-xl font-semibold tracking-[-0.02em] text-ink lg:text-2xl" /> : <span className="font-display text-xl font-semibold tracking-[-0.02em] text-ink lg:text-2xl">{formatData(plan.dataMb)}</span>}
        <span className="tabular text-xl font-semibold text-ink">{formatPrice(plan.price, plan.currency)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <span>{formatDays(plan.validityDays)}</span>
        {plan.networkType && <span className="text-xs">{plan.networkType}</span>}
        {plan.type === "unlimited" && plan.fairUse && !showsNoThrottle(plan) && <span className="text-xs underline decoration-dotted underline-offset-4" title={plan.fairUse.note ?? undefined}>Fair-Use-Regeln</span>}
        {perUnit && <span className="text-xs">{perUnit}</span>}
      </div>
      <div className="flex items-center justify-between">
        {plan.badge ? <Chip>{plan.badge === "best_price" ? "Bestpreis" : plan.badge === "popular" ? "Beliebt" : plan.badge}</Chip> : <span />}
        {selected ? (
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            <Check size={16} weight="bold" aria-hidden /> Ausgewählt
          </span>
        ) : (
          <span className="text-sm font-medium text-primary">Auswählen</span>
        )}
      </div>
    </button>
  );
}

export function PlanCardSkeleton() {
  return <div className="h-[128px] animate-pulse rounded-lg border border-line bg-surface" />;
}

/** Preisübersicht: Tarife nach Laufzeit gruppiert, pro Zeile Datenmenge links und Preis rechts. */
export function PlanList({ plans, selectedId, onSelect }: { plans: PlanItem[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const days = [...new Set(plans.map((p) => p.validityDays))].sort((a, b) => a - b);
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ink">Wähle dein Paket</h3>
      {days.map((d) => (
        <section key={d} aria-label={formatDays(d)}>
          <h4 className="mb-2 text-sm font-semibold text-ink">{formatDays(d)}</h4>
          <ul className="space-y-2">
            {plans.filter((p) => p.validityDays === d).sort((a, b) => (a.dataMb ?? Infinity) - (b.dataMb ?? Infinity) || a.price - b.price).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-pressed={selectedId === p.id}
                  className={cn(
                    "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left transition-colors duration-150",
                    selectedId === p.id ? "border-2 border-primary px-[15px] py-[11px]" : "border border-line hover:border-line-strong",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-semibold text-ink">
                      {p.type === "unlimited" ? <UnlimitedLabel throttleClaim={p.throttleClaim} /> : formatData(p.dataMb)}
                    </span>
                    {(p.badge || p.networkType) && (
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                        {p.badge && <Chip>{p.badge === "best_price" ? "Bestpreis" : p.badge === "popular" ? "Beliebt" : p.badge}</Chip>}
                        {p.networkType && <span>{p.networkType}</span>}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-xl font-semibold text-ink">{formatPrice(p.price, p.currency)}</span>
                    {selectedId === p.id && <Check size={18} weight="bold" aria-hidden className="text-primary" />}
                  </span>
                </button>
                {showsNoThrottle(p) && <div className="px-1 pt-1"><UnlimitedNote throttleClaim={p.throttleClaim} /></div>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
