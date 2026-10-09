import { computePrice, parseFeeSettings, parseMinNet, selectRule, type PriceInput, type PricingRule } from "./pricing";
import { loadFx } from "./fx.server";
import type { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function loadPricingContext(db: typeof supabaseAdmin) {
  const [fx, { data: rules, error: ruleError }, { data: settings, error: settingError }] = await Promise.all([
    loadFx(db),
    db.from("pricing_rules").select("*").order("id"),
    db.from("app_settings").select("key,value,updated_at").in("key", ["stripe_fees", "min_net_result", "vat_rate", "fx_buffer_percent"]).order("key"),
  ]);
  if (ruleError || settingError) throw new Error("Preiseinstellungen konnten nicht geladen werden.");
  const value = (key: string) => settings?.find((s) => s.key === key)?.value;
  const vat = Number(value("vat_rate")) || 0.19;
  const policy = { fees: parseFeeSettings(value("stripe_fees")), minNet: parseMinNet(value("min_net_result")) };
  const calculate = (input: PriceInput, candidateRules = (rules ?? []) as PricingRule[], candidatePolicy = policy, candidateBuffer = fx.buffer) => {
    const lookup = (from: string, to: string) => { const r = fx.lookup(from, to); return r == null ? null : r / (1 + fx.buffer / 100) * (1 + candidateBuffer / 100); };
    const price = computePrice(input, candidateRules, lookup, vat, "EUR", candidatePolicy);
    const rule = selectRule(input, candidateRules);
    const rate = input.costCurrency.toUpperCase() === "EUR" ? 1 : lookup(input.costCurrency, "EUR");
    return { price, source: input.manualPrice != null ? "manual" : `${rule?.scope ?? "none"}${rule?.scope_ref ? `:${rule.scope_ref}` : ""}`, inputs: { cost: input.costPrice, costCurrency: input.costCurrency, rate, buffer: candidateBuffer, markup: rule?.value ?? null, ruleId: rule?.id ?? null, vat, fees: candidatePolicy.fees, minNet: candidatePolicy.minNet } };
  };
  return { fx, rules: rules ?? [], settings: settings ?? [], vat, policy, calculate };
}