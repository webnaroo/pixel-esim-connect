import { FixtureBadge } from "./brand";
import { NoThrottleClaim, UnlimitedLabel } from "./unlimited-claim";
import { showsNoThrottle } from "@/lib/throttle";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CaretRight, Funnel } from "@phosphor-icons/react";
import { destinationQuery, shopStateQuery, type PlanItem } from "@/lib/catalog.functions";
import { formatDays, formatPrice, formatData } from "@/lib/format";
import { Flag, Chip, EmptyState } from "./brand";
import { DestinationRow, PlanCard } from "./catalog";
import { SegmentedControl, Button, LinkButton } from "./ui-kit";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { breadcrumbScript, pageIdentity, productScript } from "@/lib/seo";

type Filters = { days: number | null; minGb: number | null };

export function DestinationPage({ slug }: { slug: string }) {
  const { data: d } = useSuspenseQuery(destinationQuery(slug));
  const { data: shop } = useQuery(shopStateQuery());
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ days: null, minGb: null });

  const dataPlans = useMemo(() => (d?.plans ?? []).filter((p) => p.type === "data").sort((a, b) => (a.dataMb ?? 0) - (b.dataMb ?? 0) || a.validityDays - b.validityDays), [d]);
  const unlimitedPlans = useMemo(() => (d?.plans ?? []).filter((p) => p.type === "unlimited").sort((a, b) => a.validityDays - b.validityDays), [d]);
  const [tab, setTab] = useState<"data" | "unlimited">(dataPlans.length ? "data" : "unlimited");

  if (!d) return null;

  const hasPlans = d.plans.length > 0;
  const plans = (tab === "data" ? dataPlans : unlimitedPlans).filter(
    (p) => (filters.days == null || p.validityDays === filters.days) && (filters.minGb == null || p.type === "unlimited" || (p.dataMb ?? 0) >= filters.minGb * 1024),
  );
  const selectedPlan = d.plans.find((p) => p.id === selected) ?? null;
  const canBuy = shop?.state === "live" && !d.fixturePlans;
  const isCountry = d.type === "country";
  const fromPrice = hasPlans ? Math.min(...d.plans.map((p) => p.price)) : null;
  const allDays = [...new Set((tab === "data" ? dataPlans : unlimitedPlans).map((p) => p.validityDays))].sort((a, b) => a - b);
  const allGb = [...new Set(dataPlans.map((p) => Math.floor((p.dataMb ?? 0) / 1024)).filter((g) => g > 0))].sort((a, b) => a - b);
  const sample = d.plans[0];

  const filterUi = (
    <FilterPanel filters={filters} setFilters={setFilters} days={allDays} gbs={tab === "data" ? allGb : []} />
  );

  return (
    <div className="pb-28 lg:pb-0">
      <nav aria-label="Brotkrumen" className="container-page pt-6 text-sm text-ink-muted">
        <Link to="/" className="hover:text-ink">Start</Link>
        <span className="mx-2">/</span>
        <Link to="/destinations" className="hover:text-ink">Reiseziele</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{d.name}</span>
      </nav>

      <section className="container-page pt-6">
        <div className="flex items-start gap-4">
          {isCountry && <Flag code={d.flagCode} size={48} />}
          <div>
            <h1>eSIM für {d.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {sample?.networkType && <Chip>{sample.networkType}</Chip>}
              {fromPrice != null && <Chip tone="muted">ab {formatPrice(fromPrice)}</Chip>}
              {!isCountry && d.countries.length > 0 && <Chip tone="muted">{d.countries.length} Länder</Chip>}
              <NoThrottleClaim when={unlimitedPlans.some(showsNoThrottle)} className="inline-flex items-center rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink" />
            </div>
            <p className="mt-3 max-w-xl text-ink-muted">{d.content?.intro ?? "Sofort per E-Mail, in Minuten installiert. Deine bisherige SIM bleibt aktiv."}</p>
          </div>
        </div>
      </section>

      <section className="container-page mt-10" aria-labelledby="plans-h">
        {d.fixturePlans && <div className="mb-4 flex items-center gap-2 text-sm text-ink-muted"><FixtureBadge /> Beispieltarife nur in der Vorschau, nicht kaufbar.</div>}
        <h2 id="plans-h" className="sr-only">Tarife</h2>
        {!hasPlans ? (
          <EmptyState
            title={`Die Tarife für ${d.name} werden gerade vorbereitet.`}
            action={<LinkButton to="/destinations" variant="secondary">Andere Reiseziele ansehen</LinkButton>}
          >
            Schau bald wieder vorbei oder sieh dir verwandte Ziele an.
          </EmptyState>
        ) : (
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
            <aside className="hidden lg:block" aria-label="Filter">{filterUi}</aside>
            <div>
              <div className="flex items-center justify-between gap-3">
                {dataPlans.length > 0 && unlimitedPlans.length > 0 ? (
                  <SegmentedControl label="Tarifart" value={tab} onChange={(v) => { setTab(v); setFilters({ days: null, minGb: null }); }} options={[{ value: "data", label: "Datentarife" }, { value: "unlimited", label: "Unlimited" }]} />
                ) : (
                  <span />
                )}
                <Drawer>
                  <DrawerTrigger asChild>
                    <button className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-sm font-medium lg:hidden">
                      <Funnel size={18} aria-hidden /> Filter
                    </button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-surface">
                    <DrawerHeader><DrawerTitle>Filter</DrawerTitle></DrawerHeader>
                    <div className="px-5 pb-8">{filterUi}</div>
                  </DrawerContent>
                </Drawer>
              </div>
              <div className="mt-5 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {plans.map((p) => (
                  <PlanCard key={p.id} plan={p} selected={selected === p.id} onSelect={() => setSelected(p.id)} />
                ))}
              </div>
              {plans.length === 0 && <p className="mt-6 text-sm text-ink-muted">Keine Tarife für diese Filter.</p>}
              {selectedPlan && <div className="mt-6 hidden lg:block"><BuyBar plan={selectedPlan} canBuy={canBuy} inline /></div>}
            </div>
          </div>
        )}
      </section>

      {hasPlans && sample && (sample.hotspot != null || sample.voiceSms != null || sample.topUpable != null || !!sample.networks?.length || (tab === "unlimited" && !!unlimitedPlans[0]?.fairUse && !showsNoThrottle(unlimitedPlans[0]))) && (
        <section className="container-page mt-14">
          <h2>Gut zu wissen</h2>
          <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {sample.hotspot != null && <Info k="Hotspot" v={sample.hotspot ? "Ja" : "Nein"} />}
            {sample.voiceSms != null && <Info k="Telefonie / SMS" v={Object.keys(sample.voiceSms as object).length ? "Je nach Tarif" : "Nein, nur Daten"} />}
            {sample.topUpable != null && <Info k="Nachbuchen" v={sample.topUpable ? "Möglich" : "Nicht möglich"} />}
            {sample.networks?.length ? <Info k="Netze" v={sample.networks.join(", ")} /> : null}
            {tab === "unlimited" && unlimitedPlans[0]?.fairUse && !showsNoThrottle(unlimitedPlans[0]) && <Info k="Fair-Use" v={fairUseText(unlimitedPlans[0])} />}
          </dl>
        </section>
      )}

      {!isCountry && d.countries.length > 0 && (
        <section className="container-page mt-14">
          <h2>Enthaltene Länder</h2>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {d.countries.map((c) => (
              <li key={c.slug}>
                <Link to="/countries/$slug" params={{ slug: c.slug }} className="flex items-center gap-2 text-sm text-ink hover:text-primary">
                  <Flag code={c.flagCode} size={20} /> {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {Array.isArray(d.content?.faq) && (d.content.faq as { q: string; a: string }[]).length > 0 && (
        <section className="container-page mt-14 max-w-3xl">
          <h2>Fragen zu {d.name}</h2>
          <Accordion type="single" collapsible className="mt-4">
            {(d.content.faq as { q: string; a: string }[]).map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-ink-muted">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {(d.related.length > 0 || d.regions.length > 0) && (
        <section className="container-page mt-14">
          <h2>Verwandte Reiseziele</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.regions.map((r) => (
              <DestinationRow key={r.slug} d={{ type: "region", slug: r.slug, name: r.name, flagCode: null, fromPrice: null }} />
            ))}
            {d.related.map((r) => (
              <DestinationRow key={r.slug} d={{ type: "country", slug: r.slug, name: r.name, flagCode: r.flagCode, fromPrice: null }} />
            ))}
          </div>
        </section>
      )}

      {selectedPlan && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
          <div className="container-page py-3"><BuyBar plan={selectedPlan} canBuy={canBuy} /></div>
        </div>
      )}
    </div>
  );
}

function fairUseText(p: PlanItem) {
  const f = p.fairUse;
  if (!f) return "";
  if (f.note) return f.note;
  const parts = [];
  if (f.throttleAfterMb) parts.push(`Nach ${formatData(f.throttleAfterMb)} pro Tag`);
  if (f.throttledSpeedKbps) parts.push(`gedrosselt auf ${f.throttledSpeedKbps} kbit/s`);
  return parts.join(" ");
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-sm text-ink-muted">{k}</dt>
      <dd className="mt-1 font-medium text-ink">{v}</dd>
    </div>
  );
}

function BuyBar({ plan, canBuy, inline }: { plan: PlanItem; canBuy: boolean; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4" : "flex items-center justify-between gap-4"}>
      <div>
        <div className="text-sm text-ink-muted">{plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={plan.throttleClaim} /> : formatData(plan.dataMb)} · {formatDays(plan.validityDays)}</div>
        <div className="tabular text-lg font-semibold">{formatPrice(plan.price, plan.currency)}</div>
      </div>
      <div className="text-right">
        {canBuy ? <LinkButton to="/checkout/$planId" params={{ planId: plan.id }}>Weiter</LinkButton> : <Button disabled>Bald verfügbar</Button>}
        <p className="mt-1 text-xs text-ink-muted">{canBuy ? "Sofort per E-Mail · Sichere Zahlung" : "Der Kauf wird gerade vorbereitet."}</p>
      </div>
    </div>
  );
}

function FilterPanel({ filters, setFilters, days, gbs }: { filters: Filters; setFilters: (f: Filters) => void; days: number[]; gbs: number[] }) {
  return (
    <div className="space-y-6">
      {days.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold">Laufzeit</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={filters.days == null} onClick={() => setFilters({ ...filters, days: null })}>Alle</FilterChip>
            {days.map((x) => <FilterChip key={x} active={filters.days === x} onClick={() => setFilters({ ...filters, days: x })}>{formatDays(x)}</FilterChip>)}
          </div>
        </fieldset>
      )}
      {gbs.length > 1 && (
        <fieldset>
          <legend className="text-sm font-semibold">Datenvolumen ab</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterChip active={filters.minGb == null} onClick={() => setFilters({ ...filters, minGb: null })}>Alle</FilterChip>
            {gbs.map((x) => <FilterChip key={x} active={filters.minGb === x} onClick={() => setFilters({ ...filters, minGb: x })}>{x} GB</FilterChip>)}
          </div>
        </fieldset>
      )}
      {days.length <= 1 && gbs.length <= 1 && <p className="text-sm text-ink-muted">Keine weiteren Filter verfügbar.</p>}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={active ? "h-9 rounded-full border border-primary bg-primary px-3 text-sm text-primary-foreground" : "h-9 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink"}>
      {children}
    </button>
  );
}

export function destinationHead(d: { name: string; plans: { price: number }[]; fixturePlans?: boolean; content?: { seoTitle?: string | null; seoDescription?: string | null } | null } | null | undefined, path: string) {
  const identity = pageIdentity(path);
  const prices = d && !d.fixturePlans ? d.plans.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0) : [];
  const from = prices.length ? Math.min(...prices) : null;
  const title = d ? d.content?.seoTitle?.trim() || (from != null ? `eSIM für ${d.name} – ab ${formatPrice(from)} | GlobeSIM` : `eSIM für ${d.name} | GlobeSIM`) : "Reiseziel nicht gefunden | GlobeSIM";
  const description = d ? d.content?.seoDescription?.trim() || `Vergleiche GlobeSIM eSIM-Tarife für ${d.name} nach Datenvolumen, Laufzeit und Preis inkl. MwSt. Prüfe die Kompatibilität und Installation per QR-Code.` : "Dieses Reiseziel ist bei GlobeSIM nicht verfügbar.";
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...identity.meta,
      ...(prices.length ? [] : [{ name: "robots", content: "noindex, follow" }]),
    ],
    links: identity.links,
    scripts: d ? [
      ...productScript(d, path),
      breadcrumbScript([{ name: "Start", path: "/" }, { name: "Reiseziele", path: "/destinations" }, { name: d.name, path }]),
    ] : [],
  };
}

export function DestinationPending() {
  return (
    <div className="container-page pt-12">
      <div className="h-12 w-64 animate-pulse rounded-md bg-muted" />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-lg border border-line bg-surface" />)}
      </div>
    </div>
  );
}

export { CaretRight };
