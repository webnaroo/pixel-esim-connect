import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { pricingQuery } from "@/lib/admin.functions";
import { fxAdminQuery } from "@/lib/fx.functions";
import { FxSection } from "@/components/fx-admin";
import { useQuery } from "@tanstack/react-query";
import { computeMargin, computePrice, type PricingRule } from "@/lib/pricing";
import { Button, Input } from "@/components/ui-kit";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";
import { usePriceConfirmation } from "@/components/price-change-dialog";
import { PriceCheck } from "@/components/price-check";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  head: () => privateHead("Preise verwalten", "Wechselkurse, Gebühren und Preisregeln im GlobeSIM-Admin."),
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
  const confirmation = usePriceConfirmation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ value: "0", rounding: "49_99", priority: "0" });
  const fxq = useQuery(fxAdminQuery());
  const refresh = () => qc.invalidateQueries(); // prices feed admin tables and public pages
  const [scope, setScope] = useState<string>("global");
  const [test, setTest] = useState({ cost: "5", currency: "USD", slug: "turkey", type: "data" as "data" | "unlimited", planId: "" });

  async function addRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await confirmation.request({ kind: "create", rule: {
        id: crypto.randomUUID(), scope: scope as "global",
        scope_ref: scope === "global" ? null : String(f.get("scope_ref") ?? ""),
        type: String(f.get("type")) as "percent", value: Number(f.get("value")),
        rounding: String(f.get("rounding")) as "49_99", priority: Number(f.get("priority") || 0),
      } });
      form.reset();
      refresh();
    } catch {
      toast.error("Bitte Eingaben prüfen (Bezug, Wert).");
    }
  }

  const latestFx = (from: string) => fxq.data?.current.find((x) => x.currency === from)?.effective?.usedRate ?? null;
  const preview = computePrice(
    { providerPlanId: test.planId, destinationSlug: test.slug, planType: test.type, costPrice: Number(test.cost.replace(",", ".")), costCurrency: test.currency.toUpperCase() },
    data.rules as PricingRule[], (from) => latestFx(from), data.vatRate, "EUR", { fees: data.fees, minNet: data.minNet },
  );
  const testCur = test.currency.toUpperCase();
  const testRate = testCur === "EUR" ? 1 : latestFx(testCur);
  const margin = preview.ok && testRate != null ? computeMargin(Number(test.cost.replace(",", ".")) * testRate, preview.net, preview.gross, data.fees, data.minNet) : null;
  const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));
  const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  return (
    <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
      {confirmation.dialog}
      <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3"><div><strong className="text-primary">{data.mode}</strong><p className="text-sm text-ink-muted">Vorschau und Website verwenden gemeinsame Preisregeln.</p><p className={data.lastCalculation ? "text-sm text-ink-muted" : "text-sm text-danger"}>{data.lastCalculation ? `Zuletzt berechnet: ${new Date(data.lastCalculation.created_at).toLocaleString("de-DE")}` : "Vollständiger Berechnungsstand noch nicht protokolliert."}</p></div><Button variant="secondary" loading={confirmation.busy} onClick={() => confirmation.request({ kind: "recalculate" })}>Preise jetzt neu berechnen und veröffentlichen</Button></div>
      <div className="lg:col-span-2"><PriceCheck /></div>
      <section className="lg:col-span-2"><h2 className="text-xl">Preisänderungsprotokoll</h2><ul className="mt-3 divide-y divide-line text-sm">{data.history.length ? data.history.map((h) => <li className="py-2" key={h.created_at}>{new Date(h.created_at).toLocaleString("de-DE")} · {String((h.meta as { changed?: number } | null)?.changed ?? 0)} Preise geändert · Admin {h.actor_id?.slice(0, 8) ?? "Automatisch"}<details className="mt-1"><summary className="cursor-pointer text-primary">Alte und neue Einstellungen</summary><pre className="mt-2 overflow-auto text-xs">{JSON.stringify(h.meta, null, 2)}</pre></details></li>) : <li className="text-ink-muted">Noch keine vollständige Neuberechnung protokolliert.</li>}</ul></section>
      <section className="rounded-lg border border-line bg-surface p-6 lg:col-span-2">
        <h2 className="text-xl">Margenregeln</h2>
        <p className="mt-1 text-sm text-ink-muted">Reihenfolge: Tarif vor Land vor Tariftyp vor global. Innerhalb einer Ebene gewinnt die höchste Priorität.</p>
        {data.rules.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Noch keine Regel. Ohne Regel bekommt kein Tarif einen Preis.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {data.rules.map((r) => (
              <li key={r.id} className="py-3">
                {editingId === r.id ? (
                  <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await confirmation.request({ kind: "update", id: r.id, rule: { id: r.id, scope: r.scope as "global", scope_ref: r.scope_ref, type: r.type as "percent", value: num(editValue.value), rounding: editValue.rounding as "49_99", priority: Number(editValue.priority) || 0 } });
                      
                      setEditingId(null);
                      refresh();
                    } catch {
                      toast.error("Bitte Eingaben prüfen (Wert).");
                    }
                  }}>
                    <span className="font-medium">{SCOPES.find((s) => s.v === r.scope)?.l ?? r.scope}{r.scope_ref ? ` · ${r.scope_ref}` : ""} · {r.type === "percent" ? "+ %" : "+ €"}</span>
                    <Input className="w-24" value={editValue.value} onChange={(e) => setEditValue({ ...editValue, value: e.target.value })} aria-label="Wert" inputMode="decimal" required />
                    <select aria-label="Rundung" className={sel + " w-auto"} value={editValue.rounding} onChange={(e) => setEditValue({ ...editValue, rounding: e.target.value })}>
                      <option value="49_99">Auf ,49/,99</option>
                      <option value="none">Keine</option>
                    </select>
                    <Input className="w-20" value={editValue.priority} onChange={(e) => setEditValue({ ...editValue, priority: e.target.value })} aria-label="Priorität" inputMode="numeric" />
                    <Button type="submit">Speichern</Button>
                    <button type="button" className="text-sm font-medium text-ink-muted" onClick={() => setEditingId(null)}>Abbrechen</button>
                  </form>
                ) : (
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{SCOPES.find((s) => s.v === r.scope)?.l ?? r.scope}</strong>
                      {r.scope_ref ? ` · ${r.scope_ref}` : ""} · {r.type === "percent" ? `+${r.value} %` : `+${eur(r.value)}`} · Rundung {r.rounding === "49_99" ? ",49/,99" : "keine"} · Prio {r.priority}
                    </span>
                    <span className="flex gap-3">
                      <button className="text-sm font-medium" onClick={() => {
                        setEditingId(r.id);
                        setEditValue({ value: String(r.value), rounding: r.rounding === "none" ? "none" : "49_99", priority: String(r.priority) });
                      }}>Bearbeiten</button>
                      <button className="text-sm font-medium text-danger" onClick={async () => { await confirmation.request({ kind: "delete", id: r.id }); }}>Löschen</button>
                    </span>
                  </span>
                )}
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

      <FxSection />

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
          {preview.ok && margin ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
              <dt>Einkauf in EUR</dt><dd className="text-right">{eur(margin.costEur)}</dd>
              <dt className="col-span-2 text-xs text-ink-muted">Kurs 1 {testCur} = {testRate?.toLocaleString("de-DE", { maximumFractionDigits: 6 })} EUR (inkl. Sicherheitsaufschlag)</dt>
              <dt>Verkauf netto</dt><dd className="text-right">{eur(preview.net)}</dd>
              <dt>MwSt. ({Math.round(data.vatRate * 100)} %)</dt><dd className="text-right">{eur(preview.vat)}</dd>
              <dt><strong>Verkauf brutto</strong></dt><dd className="text-right"><strong>{eur(preview.gross)}</strong></dd>
              <dt>Stripe-Gebühr ({data.fees.percent.toLocaleString("de-DE")} % + {eur(data.fees.fixed)})</dt><dd className="text-right">−{eur(margin.fee)}</dd>
              <dt className="font-semibold">Nettoergebnis</dt>
              <dd className="text-right font-semibold">{eur(margin.result)} · {margin.resultPercent.toLocaleString("de-DE")} % vom Einkauf</dd>
            </dl>
          ) : preview.ok ? (
            <>Netto {eur(preview.net)} · MwSt. {eur(preview.vat)} · <strong>Brutto {eur(preview.gross)}</strong></>
          ) : (
            <>Kein Preis: {preview.reason === "missing_fx" ? "Wechselkurs fehlt" : preview.reason === "no_rule" ? "keine passende Margenregel" : "Einkaufspreis ungültig"}</>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Gebühren (Stripe)</h2>
        <p className="mt-1 text-sm text-ink-muted">Bitte prüfen: Stripe-Gebühren hängen von Kartenart und Vertrag ab. Standard 2,9 % + 0,30 € ist nur eine Annahme.</p>
        <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await confirmation.request({ kind: "settings", settings: { stripe_fees: { percent: num(f.get("percent")), fixed: num(f.get("fixed")) }, min_net_result: num(f.get("minNet")) } });
          } catch { toast.error("Bitte Werte prüfen."); }
        }}>
          <label className="text-sm">Gebühr in %<Input name="percent" inputMode="decimal" defaultValue={String(data.fees.percent).replace(".", ",")} /></label>
          <label className="text-sm">Fixbetrag in €<Input name="fixed" inputMode="decimal" defaultValue={String(data.fees.fixed).replace(".", ",")} /></label>
          <label className="text-sm col-span-2">Mindestgewinn nach Gebühren (€)<Input name="minNet" inputMode="decimal" defaultValue={String(data.minNet).replace(".", ",")} /></label>
           <Button type="submit" className="col-span-2 justify-self-start">Vorschau prüfen</Button>
        </form>
      </section>
    </div>
  );
}
