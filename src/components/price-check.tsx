import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { priceCheckQuery, releasePlans } from "@/lib/golive.functions";
import { toCsv, type buildPriceCheck } from "@/lib/golive-rules";
import type { FeeSettings } from "@/lib/pricing";
import { usePriceConfirmation } from "./price-change-dialog";
import { Button } from "@/components/ui-kit";

const eur = (v: number | null) => (v == null ? "–" : `${v.toFixed(2).replace(".", ",")} €`);
const usd = (v: number | null) => (v == null ? "–" : `${v.toFixed(2).replace(".", ",")} $`);
const COUNTRY: Record<string, string> = { TR: "Türkei", EG: "Ägypten", US: "USA", AE: "VAE", SA: "Saudi-Arabien" };

export function PriceCheck() {
  const confirmation = usePriceConfirmation();
  const q = useQuery(priceCheckQuery());
  const qc = useQueryClient();
  const release = useServerFn(releasePlans);
  const [open, setOpen] = useState<string | null>(null);
  if (q.isLoading) return <p className="text-sm text-ink-muted">Prüfliste wird geladen …</p>;
  if (!q.data) return <p className="text-sm text-danger">Prüfliste konnte nicht geladen werden.</p>;
  const d = q.data as unknown as ReturnType<typeof buildPriceCheck> & { fees: FeeSettings; lastSync: string | null };
  const byId = new Map(d.rows.map((r) => [r.id, r]));
  const label = (id: string) => { const r = byId.get(id); return r ? `${r.destinationName ?? "?"} · ${r.type === "unlimited" ? "Unlimited" : `${Math.round((r.dataMb ?? 0) / 102.4) / 10} GB`} · ${r.validityDays} T · ${r.providerPlanId}` : id; };
  const items: { key: string; title: string; ids: string[]; extra?: (id: string) => string; action?: React.ReactNode }[] = [
    { key: "noCost", title: "Tarife ohne Einkaufspreis", ids: d.lists.noCost },
    { key: "noMargin", title: "Tarife ohne Marge (keine Regel greift)", ids: d.lists.noMargin },
    { key: "unmapped", title: "Tarife ohne Land/Region-Zuordnung", ids: d.lists.unmapped.map((u) => u.providerPlanId ?? "ohne ID"), extra: (id) => d.lists.unmapped.find((u) => (u.providerPlanId ?? "ohne ID") === id)?.reason ?? "" },
    { key: "deviation", title: "Preisabweichung (Katalog vs. zuletzt bezahlt)", ids: d.lists.deviation.map((x) => x.id), extra: (id) => { const x = d.lists.deviation.find((y) => y.id === id)!; return `Katalog ${usd(x.catalog)} · bezahlt ${usd(x.paid)}`; } },
    { key: "new", title: "Neue Tarife (unsichtbar bis zur Freigabe)", ids: d.lists.newPlans, action: d.lists.newPlans.length ? <Button variant="secondary" onClick={async () => { const r = await release({ data: { planIds: d.lists.newPlans } }); toast.success(`${r.count} Tarife freigegeben.`); qc.invalidateQueries(); }}>Alle freigeben</Button> : null },
    { key: "gone", title: "Seit dem letzten Sync verschwunden", ids: d.lists.gone },
  ];

  const sampleRows = d.samples.map((s) => ({ s, r: s.row }));
  function exportCsv() {
    const head = ["Land", "Art", "Tarif", "Einkauf USD", "Kurs inkl. Puffer", "Einkauf EUR", "Netto", "Brutto inkl. 19 % MwSt.", "Marge EUR", "Marge %", "Stripe-Gebühr", "Rest nach Gebühr"];
    const rows = sampleRows.map(({ s, r }) => [COUNTRY[s.iso] ?? s.iso, s.kind === "cheapest" ? "günstigster" : s.kind === "biggest" ? "größte Datenmenge" : "kein Tarif", r ? label(r.id) : "", r?.costPrice ?? null, r?.fxRate != null ? r.fxRate.toFixed(4).replace(".", ",") : null, r?.costEur ?? null, r?.net ?? null, r?.gross ?? null, r?.margin ?? null, r?.marginPercent != null ? `${String(r.marginPercent).replace(".", ",")} %` : null, r?.fee ?? null, r?.rest ?? null]);
    const blob = new Blob(["\ufeff" + toCsv([head, ...rows])], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `globesim-stichprobe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      {confirmation.dialog}
      <h2 className="text-xl">Prüfliste Preise</h2>
      <p className="mt-1 text-sm text-ink-muted">Stand letzter Sync: {d.lastSync ? new Date(d.lastSync).toLocaleString("de-DE") : "noch keiner"}. Nur Anzeige – Kundenpreise ändern sich dadurch nicht.</p>
      <ul className="mt-3 divide-y divide-line">
        {items.map((it) => (
          <li key={it.key} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="text-left font-medium" onClick={() => setOpen(open === it.key ? null : it.key)} aria-expanded={open === it.key}>
                <span className={it.ids.length ? "text-danger" : "text-mint"}>{it.ids.length}</span> · {it.title}
              </button>
              {it.action}
            </div>
            {open === it.key && it.ids.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {it.ids.map((id) => <li key={id}><a href={`/admin/plans?q=${encodeURIComponent(byId.get(id)?.providerPlanId ?? id)}`} className="text-primary underline">{label(id)}</a>{it.extra ? <span className="text-ink-muted"> · {it.extra(id)}</span> : null}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg">Stichprobe</h3>
        <Button variant="secondary" onClick={exportCsv}>Als CSV exportieren</Button>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm tabular">
          <thead className="text-ink-muted"><tr>{["Land", "Tarif", "Einkauf USD", "Kurs inkl. Puffer", "Einkauf EUR", "Netto", "Brutto inkl. 19 %", "Marge €", "Marge %", "Stripe-Gebühr", "Rest", "Aufschlag", "Preisquelle", "Zuletzt berechnet", "Preis überschreiben"].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {sampleRows.map(({ s, r }, i) => (
              <tr key={i}>
                <td className="py-2 pr-3 whitespace-nowrap">{COUNTRY[s.iso]} <span className="text-ink-muted">({s.kind === "cheapest" ? "günstigster" : s.kind === "biggest" ? "größte Daten" : "kein Tarif"})</span></td>
                <td className="pr-3">{r ? label(r.id) : "–"}</td>
                <td className="pr-3">{usd(r?.costPrice ?? null)}</td>
                <td className="pr-3">{r?.fxRate != null ? r.fxRate.toFixed(4).replace(".", ",") : "–"}</td>
                <td className="pr-3">{eur(r?.costEur ?? null)}</td>
                <td className="pr-3">{eur(r?.net ?? null)}</td>
                <td className="pr-3">{eur(r?.gross ?? null)}</td>
                <td className="pr-3">{eur(r?.margin ?? null)}</td>
                <td className="pr-3">{r?.marginPercent != null ? `${String(r.marginPercent).replace(".", ",")} %` : "–"}</td>
                <td className="pr-3">{eur(r?.fee ?? null)}</td>
                <td className="pr-3 font-medium">{eur(r?.rest ?? null)}</td>
                 <td className="pr-3">{r?.priceInputs && typeof r.priceInputs === "object" ? String((r.priceInputs as { markup?: number }).markup ?? "–") : "–"}</td>
                 <td className="pr-3">{r?.manualPrice != null ? "Preis überschrieben" : r?.priceSource ?? "Noch nicht erfasst"}</td>
                 <td className="pr-3 whitespace-nowrap">{r?.calculatedAt ? new Date(r.calculatedAt).toLocaleString("de-DE") : "–"}</td>
                 <td className="pr-3">{r && <Button variant="secondary" loading={confirmation.busy} onClick={() => { const v = window.prompt("Manueller Bruttopreis in EUR (leer = Überschreibung entfernen)", r.manualPrice == null ? "" : String(r.manualPrice)); if (v === null) return; const price = v.trim() ? Number(v.replace(",", ".")) : null; if (price !== null && (!Number.isFinite(price) || price <= 0)) return toast.error("Bitte einen gültigen Preis eingeben."); void confirmation.request({ kind: "override", id: r.id, override: price }); }}>Bearbeiten</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
