// Pure go-live rules (Stripe live gate, webhook mode by secret, price check, receipt gaps). Server code calls them.
import { computeMargin, computePrice, type FeeSettings, type FxLookup, type PricingRule } from "./pricing";

export type Mode = "sandbox" | "live";

/** Which secret verified the signature decides the mode. A payload mode that contradicts it is a conflict. */
export function webhookModeFromSecret(matched: Mode, payloadMode: Mode | null): { mode: Mode; conflict: boolean } {
  return { mode: matched, conflict: payloadMode !== null && payloadMode !== matched };
}

export type StripeState = { liveKey: boolean; liveSecret: boolean; liveEventsProcessed: number };
export const stripeMode = (s: StripeState): "live" | "test" => (s.liveKey ? "live" : "test");
/** Shop may only open when live payments are active, the live webhook secret is set and one signed live event was processed. */
export function stripeLiveMissing(s: StripeState): string[] {
  const m: string[] = [];
  if (!s.liveKey) m.push("Stripe Live aktiv");
  if (!s.liveSecret) m.push("Stripe Live-Webhook-Geheimnis gesetzt");
  if (!(s.liveEventsProcessed > 0)) m.push("Stripe Live-Event empfangen");
  return m;
}

// ---------- Price check after sync ----------
export const SAMPLE_COUNTRIES = ["TR", "EG", "US", "AE", "SA"] as const;

export type CheckPlan = {
  id: string; providerPlanId: string; type: "data" | "unlimited"; dataMb: number | null; validityDays: number;
  costPrice: number | null; costCurrency: string; destinationId: string | null; destinationSlug: string | null; destinationName: string | null;
  iso: string | null; isActive: boolean; released: boolean;
};
export type CheckRow = CheckPlan & {
  fxRate: number | null; costEur: number | null; net: number | null; gross: number | null;
  margin: number | null; marginPercent: number | null; fee: number | null; rest: number | null;
};

export function priceRow(p: CheckPlan, rules: PricingRule[], fx: FxLookup, vat: number, fees: FeeSettings): CheckRow {
  const rate = p.costCurrency.toUpperCase() === "EUR" ? 1 : fx(p.costCurrency.toUpperCase(), "EUR");
  const base = { ...p, fxRate: rate, costEur: null, net: null, gross: null, margin: null, marginPercent: null, fee: null, rest: null };
  if (!p.costPrice || !p.destinationSlug || rate == null) return base;
  const price = computePrice({ providerPlanId: p.providerPlanId, destinationSlug: p.destinationSlug, planType: p.type, costPrice: p.costPrice, costCurrency: p.costCurrency }, rules, fx, vat);
  const costEur = Math.round(p.costPrice * rate * 100) / 100;
  if (!price.ok) return { ...base, costEur };
  const m = computeMargin(costEur, price.net, price.gross, fees, 0);
  const margin = Math.round((price.net - costEur) * 100) / 100;
  return { ...base, costEur, net: price.net, gross: price.gross, margin, marginPercent: costEur > 0 ? Math.round((margin / costEur) * 1000) / 10 : null, fee: m.fee, rest: m.result };
}

export type PriceCheckInput = {
  plans: CheckPlan[]; rules: PricingRule[]; fx: FxLookup; vat: number; fees: FeeSettings;
  /** provider_plan_id → cost the provider actually charged on the latest order (USD). */
  lastPaid: Record<string, number>;
  unmapped: { providerPlanId: string | null; reason: string }[];
  newIds: string[]; goneIds: string[];
};

export function buildPriceCheck(i: PriceCheckInput) {
  const rows = i.plans.map((p) => priceRow(p, i.rules, i.fx, i.vat, i.fees));
  const active = rows.filter((r) => r.isActive || !r.released);
  const ids = (xs: CheckRow[]) => xs.map((r) => r.id);
  const noRule = active.filter((r) => r.costPrice && r.destinationSlug && r.fxRate != null && r.net === null);
  const deviation = active.filter((r) => {
    const paid = i.lastPaid[r.providerPlanId];
    return paid != null && r.costPrice != null && Math.abs(paid - r.costPrice) > 0.005;
  });
  type Sample = { iso: string; kind: "none" | "cheapest" | "biggest"; row: CheckRow | null };
  const samples: Sample[] = SAMPLE_COUNTRIES.flatMap((iso): Sample[] => {
    const list = rows.filter((r) => r.iso === iso && r.isActive && r.costPrice);
    if (!list.length) return [{ iso, kind: "none" as const, row: null }];
    const cheapest = [...list].sort((a, b) => (a.costPrice ?? 0) - (b.costPrice ?? 0))[0]!;
    const biggest = [...list].sort((a, b) => (b.type === "unlimited" ? 1e9 : (b.dataMb ?? 0)) - (a.type === "unlimited" ? 1e9 : (a.dataMb ?? 0)))[0]!;
    return [{ iso, kind: "cheapest" as const, row: cheapest }, ...(biggest.id !== cheapest.id ? [{ iso, kind: "biggest" as const, row: biggest }] : [{ iso, kind: "biggest" as const, row: cheapest }])];
  });
  return {
    rows,
    lists: {
      noCost: ids(active.filter((r) => !r.costPrice)),
      noMargin: ids(noRule),
      unmapped: i.unmapped,
      deviation: deviation.map((r) => ({ id: r.id, catalog: r.costPrice!, paid: i.lastPaid[r.providerPlanId]! })),
      newPlans: ids(rows.filter((r) => !r.released)),
      gone: i.goneIds,
    },
    samples,
  };
}

export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v == null ? "" : typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(";")).join("\n");
}

// ---------- Receipt / invoice fields ----------
export const RECEIPT_FIELDS = [
  { key: "company_name", label: "Firmenname" },
  { key: "street", label: "Straße" },
  { key: "zip", label: "PLZ" },
  { key: "city", label: "Ort" },
  { key: "vat_id", label: "USt-IdNr." },
] as const;

export function receiptGaps(company: Record<string, unknown> | null): string[] {
  const c = company ?? {};
  return RECEIPT_FIELDS.filter((f) => {
    const v = c[f.key];
    return typeof v !== "string" || v.trim().length < 2;
  }).map((f) => f.label);
}
