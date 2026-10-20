import { loadPricingContext } from "./pricing-context.server";
import { computeMargin, type PricingRule } from "./pricing";

export type PriceChange = { kind: "recalculate" | "create" | "update" | "delete" | "settings" | "override"; id?: string; rule?: PricingRule; settings?: Record<string, unknown>; override?: number | null };

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => `${JSON.stringify(key)}:${canonicalJson(v)}`).join(",")}}`;
}

export async function preparePriceChange(change: PriceChange) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const ctx = await loadPricingContext(db);
  const rules = ctx.rules.filter((r) => !(["update", "delete"].includes(change.kind) && r.id === change.id));
  if (change.rule) rules.push(change.rule as typeof rules[number]);
  const policy = { ...ctx.policy };
  if (change.settings?.["stripe_fees"]) policy.fees = change.settings["stripe_fees"] as typeof policy.fees;
  if (typeof change.settings?.["min_net_result"] === "number") policy.minNet = change.settings["min_net_result"];
  const rows = [];
  let changed = 0, overridden = 0, unchanged = 0, invalid = 0, belowMin = 0;
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from("plans").select("id,provider_plan_id,type,cost_price,cost_currency,sell_price,price_override,updated_at,destination:destinations!plans_destination_id_fkey(slug)").eq("provider", "esimerge").order("id").range(from, from + 499);
    if (error) throw new Error("Tarife konnten nicht vollständig geladen werden.");
    for (const p of data ?? []) {
      if (!p.destination) { invalid++; continue; }
      const override = change.kind === "override" && change.id === p.id ? change.override ?? null : p.price_override;
      const result = ctx.calculate({ providerPlanId: p.provider_plan_id, destinationSlug: p.destination.slug, planType: p.type, costPrice: Number(p.cost_price), costCurrency: p.cost_currency, manualPrice: override }, rules as PricingRule[], policy, typeof change.settings?.["fx_buffer_percent"] === "number" ? change.settings["fx_buffer_percent"] : ctx.fx.buffer);
      if (!result.price.ok) { invalid++; continue; }
      const gross = result.price.gross;
      if (gross !== Number(p.sell_price)) changed++;
      else if (override != null) overridden++;
      else unchanged++;
      const rate = result.inputs.rate;
      if (rate != null && computeMargin(Number(p.cost_price) * rate, result.price.net, gross, policy.fees, policy.minNet).belowMin) belowMin++;
      rows.push({ id: p.id, gross, old_gross: Number(p.sell_price), source: result.source, inputs: result.inputs, override, updated_at: p.updated_at });
    }
    if (!data || data.length < 500) break;
  }
  const encoded = new TextEncoder().encode(canonicalJson({ change, rules: ctx.rules, settings: ctx.settings, rows, invalid }));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoded)), (v) => v.toString(16).padStart(2, "0")).join("");
  return { change, rows, rulesBefore: ctx.rules, settingsBefore: ctx.settings, digest, counts: { changed, unchanged, overridden, invalid, belowMin, calculated: rows.length } };
}

export async function applyPreparedPrices(prepared: Awaited<ReturnType<typeof preparePriceChange>>, actor: string | null) {
  if (prepared.counts.invalid) throw new Error(`${prepared.counts.invalid} Tarife können nicht berechnet werden. Es wurde nichts geändert.`);
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { error } = await db.rpc("apply_price_calculation", { _rows: prepared.rows as never, _rules_before: prepared.rulesBefore as never, _settings_before: prepared.settingsBefore as never, _change: prepared.change as never, _actor: actor as never });
  if (error) console.error("price_apply_failed", error.code ?? "no_code", error.message.slice(0, 160), { rows: prepared.rows.length });
  if (error) throw new Error(error.message.includes("price_preview_stale") ? "Die Daten haben sich geändert. Bitte Vorschau erneut prüfen." : "Preisänderung konnte nicht vollständig gespeichert werden. Es wurde nichts geändert.");
  return { changed: prepared.counts.changed, activated: 0, hidden: 0, calculated: prepared.counts.calculated };
}