import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { deletePricingRule, pricingQuery, saveFxRate, savePricingRule } from "@/lib/admin.functions";
import { computePrice, type PricingRule } from "@/lib/pricing";
import { Button, Input } from "@/components/ui-kit";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pricingQuery()),
  errorComponent: AdminError,
  component: Pricing,
});

const SCOPES = [
  { v: "plan", l: "Tarif (Provider-ID)" },
  { v: "country", l: "Land/Region (Slug)" },
  { v: "plan_type", l: "Tariftyp (data/unlimited)" },
  { v: "global", l: "Global" },
] as const;
const sel = "h-12 w-full rounded-md border border-line-strong bg-surface px-3 text-base";

function Pricing() {
  const { data } = useSuspenseQuery(pricingQuery());
  const qc = useQueryClient();
  const save = useServerFn(savePricingRule);
  const del = useServerFn(deletePricingRule);
  const saveFx = useServerFn(saveFxRate);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "pricing"] });
  const [scope, setScope] = useState<string>("global");
  const [test, setTest] = useState({ cost: "5", currency: "USD", slug: "turkey", type: "data" as "data" | "unlimited", planId: "" });

  async function addRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await save({ data: {
        scope: scope as "global",
        scope_ref: scope === "global" ? null : String(f.get("scope_ref") ?? ""),
        type: String(f.get("type")) as "percent",
        value: Number(f.get("value")),
        rounding: String(f.get("rounding")) as "49_99",
        priority: Number(f.get("priority") || 0),
      } });
      toast.success("Regel gespeichert.");
      e.currentTarget?.reset();
      refresh();
    } catch {
      toast.error("Bitte Eingaben prüfen (Bezug, Wert).");
    }
  }

  async function addFx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await saveFx({ data: { from: String(f.get("from")).toUpperCase().trim(), rate: Number(String(f.get("rate")).replace(",", ".")) } });
      toast.success("Kurs gespeichert.");
      refresh();
    } catch {
      toast.error("Bitte Währungscode (3 Buchstaben) und Kurs prüfen.");
    }
  }

  const latestFx = (from: string) => data.fx.find((x) => x.from_currency === from && x.to_currency === "EUR")?.rate ?? null;
  const preview = computePrice(
    { providerPlanId: test.planId, destinationSlug: test.slug, planType: test.type, costPrice: Number(test.cost.replace(",", ".")), costCurrency: test.currency.toUpperCase() },
    data.rules as PricingRule[], (from) => latestFx(from), 0.19,
  );
  const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-surface p-6 lg:col-span-2">
        <h2 className="text-xl">Margenregeln</h2>
        <p className="mt-1 text-sm text-ink-muted">Reihenfolge: Tarif vor Land vor Tariftyp vor global. Innerhalb einer Ebene gewinnt die höchste Priorität.</p>
        {data.rules.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Noch keine Regel. Ohne Regel bekommt kein Tarif einen Preis.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {data.rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <strong>{SCOPES.find((s) => s.v === r.scope)?.l ?? r.scope}</strong>
                  {r.scope_ref ? ` · ${r.scope_ref}` : ""} · {r.type === "percent" ? `+${r.value} %` : `+${eur(r.value)}`} · Rundung {r.rounding === "49_99" ? ",49/,99" : "keine"} · Prio {r.priority}
                </span>
                <button className="text-sm font-medium text-danger" onClick={async () => { await del({ data: { id: r.id } }); refresh(); }}>Löschen</button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addRule} className="mt-6 grid gap-3 sm:grid-cols-3">
          <select aria-label="Ebene" className={sel} value={scope} onChange={(e) => setScope(e.target.value)}>
            {SCOPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <Input name="scope_ref" placeholder="Bezug (z. B. turkey)" aria-label="Bezug" disabled={scope === "global"} />
          <select name="type" aria-label="Art" className={sel}><option value="percent">Prozent</option><option value="fixed">Fester Betrag (€)</option></select>
          <Input name="value" type="number" step="0.01" placeholder="Wert" aria-label="Wert" required />
          <select name="rounding" aria-label="Rundung" className={sel}><option value="49_99">Auf ,49/,99</option><option value="none">Keine</option></select>
          <Input name="priority" type="number" placeholder="Priorität (0)" aria-label="Priorität" />
          <Button type="submit" className="sm:col-span-3 sm:justify-self-start">Regel hinzufügen</Button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Wechselkurse nach EUR</h2>
        <p className="mt-1 text-sm text-ink-muted">Fehlt ein Kurs, bekommt der Tarif keinen Preis und bleibt unsichtbar.</p>
        <ul className="mt-4 divide-y divide-line text-sm tabular">
          {data.fx.length === 0 && <li className="py-2 text-ink-muted">Noch keine Kurse.</li>}
          {data.fx.slice(0, 10).map((x) => (
            <li key={x.id} className="flex justify-between py-2"><span>1 {x.from_currency} = {x.rate} {x.to_currency}</span><span className="text-ink-muted">{new Date(x.valid_from).toLocaleDateString("de-DE")}</span></li>
          ))}
        </ul>
        <form onSubmit={addFx} className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-3">
          <Input name="from" placeholder="USD" maxLength={3} aria-label="Währung" required />
          <Input name="rate" placeholder="0,92" aria-label="Kurs" required />
          <Button type="submit">Speichern</Button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Preis testen</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input value={test.cost} onChange={(e) => setTest({ ...test, cost: e.target.value })} aria-label="Einkaufspreis" placeholder="Einkauf" />
          <Input value={test.currency} onChange={(e) => setTest({ ...test, currency: e.target.value })} aria-label="Währung" maxLength={3} />
          <Input value={test.slug} onChange={(e) => setTest({ ...test, slug: e.target.value })} aria-label="Land/Region-Slug" />
          <select className={sel} value={test.type} aria-label="Tariftyp" onChange={(e) => setTest({ ...test, type: e.target.value as "data" })}><option value="data">data</option><option value="unlimited">unlimited</option></select>
          <Input className="col-span-2" value={test.planId} onChange={(e) => setTest({ ...test, planId: e.target.value })} aria-label="Provider-Tarif-ID" placeholder="Provider-Tarif-ID (optional)" />
        </div>
        <div className="mt-4 rounded-md bg-muted p-4 text-sm tabular">
          {preview.ok ? (
            <>Netto {eur(preview.net)} · MwSt. {eur(preview.vat)} · <strong>Brutto {eur(preview.gross)}</strong></>
          ) : (
            <>Kein Preis: {preview.reason === "missing_fx" ? "Wechselkurs fehlt" : preview.reason === "no_rule" ? "keine passende Margenregel" : "Einkaufspreis ungültig"}</>
          )}
        </div>
      </section>
    </div>
  );
}
