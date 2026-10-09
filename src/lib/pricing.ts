// Pure price calculation. No I/O — callers pass rules, FX lookup and VAT rate.
// Rule precedence: plan > country (destination) > plan_type > global; within a scope the highest priority wins.

export type PricingScope = "plan" | "country" | "plan_type" | "global";
export type PricingRule = {
  id: string;
  scope: PricingScope | string;
  scope_ref: string | null;
  type: "percent" | "fixed" | string;
  value: number;
  rounding: "49_99" | "none" | null | string;
  priority: number;
};
export type PriceInput = {
  providerPlanId: string;
  destinationSlug: string;
  planType: "data" | "unlimited";
  costPrice: number;
  costCurrency: string;
};
export type FxLookup = (from: string, to: string) => number | null;
export type PriceResult =
  | { ok: true; net: number; vat: number; gross: number; currency: string; ruleId: string }
  | { ok: false; reason: "missing_fx" | "no_rule" | "invalid_cost" };

export const SCOPE_ORDER: PricingScope[] = ["plan", "country", "plan_type", "global"];

export function selectRule(input: PriceInput, rules: PricingRule[]): PricingRule | null {
  const refFor: Record<PricingScope, string | null> = {
    plan: input.providerPlanId,
    country: input.destinationSlug,
    plan_type: input.planType,
    global: null,
  };
  for (const scope of SCOPE_ORDER) {
    const matches = rules.filter((r) => r.scope === scope && (scope === "global" || r.scope_ref === refFor[scope]));
    if (matches.length) return [...matches].sort((a, b) => b.priority - a.priority)[0] ?? null;
  }
  return null;
}

const toCents = (v: number) => Math.round(v * 100);

/** Rounds a gross amount UP to the next x,49 or x,99. */
export function roundTo4999(gross: number): number {
  const cents = Math.ceil(Math.round(gross * 1000) / 10); // tolerate float noise
  const euros = Math.floor(cents / 100);
  const rest = cents - euros * 100;
  const target = rest <= 49 ? 49 : 99;
  return (euros * 100 + target) / 100;
}

export function computePrice(input: PriceInput, rules: PricingRule[], fx: FxLookup, vatRate: number, currency = "EUR"): PriceResult {
  if (!Number.isFinite(input.costPrice) || input.costPrice <= 0) return { ok: false, reason: "invalid_cost" };
  const rate = input.costCurrency.toUpperCase() === currency.toUpperCase() ? 1 : fx(input.costCurrency.toUpperCase(), currency.toUpperCase());
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return { ok: false, reason: "missing_fx" };
  const rule = selectRule(input, rules);
  if (!rule) return { ok: false, reason: "no_rule" };

  const cost = input.costPrice * rate;
  const netRaw = rule.type === "fixed" ? cost + Number(rule.value) : cost * (1 + Number(rule.value) / 100);
  let gross = toCents(netRaw * (1 + vatRate)) / 100;
  if (rule.rounding === "49_99") gross = roundTo4999(gross);
  const net = toCents(gross / (1 + vatRate)) / 100;
  const vat = toCents(gross - net) / 100;
  return { ok: true, net, vat, gross, currency, ruleId: rule.id };
}

// ---------- Margin / net result (admin view) ----------
export type FeeSettings = { percent: number; fixed: number };
export const DEFAULT_STRIPE_FEES: FeeSettings = { percent: 2.9, fixed: 0.3 };
export const DEFAULT_MIN_NET_RESULT = 0;
export type Margin = { costEur: number; fee: number; result: number; resultPercent: number; belowMin: boolean };

/** Payment fee on the gross amount; net result = net sell price − EUR cost − fee. Percent is relative to EUR cost. */
export function computeMargin(costEur: number, net: number, gross: number, fees: FeeSettings, minNet: number): Margin {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const c = r2(costEur);
  const fee = r2((gross * fees.percent) / 100 + fees.fixed);
  const result = r2(net - c - fee);
  const resultPercent = c > 0 ? Math.round((result / c) * 1000) / 10 : 0;
  return { costEur: c, fee, result, resultPercent, belowMin: result < minNet };
}

export function parseFeeSettings(v: unknown): FeeSettings {
  const o = (v ?? {}) as { percent?: unknown; fixed?: unknown };
  const p = Number(o.percent), f = Number(o.fixed);
  return { percent: Number.isFinite(p) && p >= 0 ? p : DEFAULT_STRIPE_FEES.percent, fixed: Number.isFinite(f) && f >= 0 ? f : DEFAULT_STRIPE_FEES.fixed };
}
export function parseMinNet(v: unknown): number {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n : DEFAULT_MIN_NET_RESULT;
}
