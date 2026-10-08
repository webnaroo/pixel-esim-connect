// Exchange-rate loading, fetching (ECB primary, Frankfurter fallback) and plan repricing. Rules live in ./fx.ts.
import { DEFAULT_BUFFER_PERCENT, decideNewRate, effectiveRate, fetchQuotes, invertEurRate, lastAutoRate, parseEcbXml, parseFrankfurter, shouldReprice, type FxRow } from "./fx";
import { computePrice, type PricingRule } from "./pricing";

export const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export const FALLBACK_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof admin>>;

export async function loadFx(db: Db, now = new Date()) {
  const since = new Date(now.getTime() - 40 * 86_400_000).toISOString();
  const [{ data: rows }, { data: buf }] = await Promise.all([
    db.from("fx_rates").select("from_currency,to_currency,rate,source,status,published_at,fetched_at,expires_at").eq("status", "active").gte("fetched_at", since),
    db.from("app_settings").select("value").eq("key", "fx_buffer_percent").maybeSingle(),
  ]);
  const list = (rows ?? []).map((r) => ({ ...r, rate: Number(r.rate) })) as FxRow[];
  const buffer = typeof buf?.value === "number" ? buf.value : Number(buf?.value ?? DEFAULT_BUFFER_PERCENT);
  const effective = (from: string) => effectiveRate(list, from.toUpperCase(), now, buffer);
  const lookup = (from: string, to: string) => (to.toUpperCase() === "EUR" ? (effective(from)?.usedRate ?? null) : null);
  return { rows: list, buffer, effective, lookup };
}

async function timed<T>(db: Db, provider: string, url: string, f: () => Promise<T>) {
  const t = Date.now();
  try {
    const v = await f();
    await db.from("api_logs").insert({ provider, endpoint: url, status: v ? 200 : 502, latency_ms: Date.now() - t, error: v ? null : "unparseable" });
    return v;
  } catch (e) {
    await db.from("api_logs").insert({ provider, endpoint: url, status: null, latency_ms: Date.now() - t, error: e instanceof Error ? e.message.slice(0, 200) : "error" });
    throw e;
  }
}

const get = async (url: string) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "GlobeSIM-FX/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};

export async function refreshRates(trigger: "cron" | "manual", actorId: string | null = null) {
  const db = await admin();
  const { data: cur } = await db.from("plans").select("cost_currency").eq("provider", "esimerge");
  const currencies = [...new Set(["USD", ...(cur ?? []).map((c) => c.cost_currency.toUpperCase())])].filter((c) => c !== "EUR");
  const res = await fetchQuotes(
    () => timed(db, "ecb", ECB_URL, async () => parseEcbXml(await (await get(ECB_URL)).text())),
    () => timed(db, "frankfurter", FALLBACK_URL, async () => parseFrankfurter(await (await get(FALLBACK_URL)).json())),
  );
  if (!res.quotes) {
    await db.from("audit_log").insert({ actor_id: actorId, action: "fx_fetch_failed", entity: "fx_rates", meta: { trigger, warning: res.warning } as never });
    return { ok: false as const, warning: res.warning, stored: [] as { currency: string; rate: number; status: string }[] };
  }
  const { data: prev } = await db.from("fx_rates").select("from_currency,to_currency,rate,source,status,published_at,fetched_at,expires_at").eq("status", "active").neq("source", "manual").order("fetched_at", { ascending: false }).limit(200);
  const prevRows = (prev ?? []).map((r) => ({ ...r, rate: Number(r.rate) })) as FxRow[];
  const stored: { currency: string; rate: number; status: string }[] = [];
  const missing: string[] = [];
  const unchanged: string[] = [];
  for (const c of currencies) {
    const eurTo = res.quotes.eurTo[c];
    if (!eurTo) { missing.push(c); continue; }
    const rate = Number(invertEurRate(eurTo).toFixed(8));
    // Same rate + same publication date as the newest fetched row → only bump "last checked", no new history entry.
    const { data: last } = await db.from("fx_rates").select("id,rate,published_at").eq("from_currency", c).eq("to_currency", "EUR").neq("source", "manual").order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Number(last.rate) === rate && last.published_at === res.quotes.date) {
      await db.from("fx_rates").update({ last_checked_at: new Date().toISOString() }).eq("id", last.id);
      unchanged.push(c);
      continue;
    }
    const status = decideNewRate(lastAutoRate(prevRows, c), rate) === "accept" ? "active" : "pending_review";
    await db.from("fx_rates").insert({ from_currency: c, to_currency: "EUR", rate, source_rate: eurTo, source: res.source, status, published_at: res.quotes.date, valid_from: new Date().toISOString(), fetched_at: new Date().toISOString() });
    stored.push({ currency: c, rate, status });
  }
  await db.from("audit_log").insert({ actor_id: actorId, action: "fx_fetch", entity: "fx_rates", meta: { trigger, source: res.source, published_at: res.quotes.date, stored, missing, unchanged } as never });
  const reprice = stored.some((s) => s.status === "active") ? await repricePlans(actorId) : null;
  return { ok: true as const, source: res.source, publishedAt: res.quotes.date, stored, missing, unchanged, reprice };
}

/** Recompute prices with the current effective rate; only moves > 0.5 % change the shown price. No valid rate → plan hidden. */
export async function repricePlans(actorId: string | null = null) {
  const db = await admin();
  const fx = await loadFx(db);
  const [{ data: plans }, { data: rules }, { data: vatRow }, { data: latest }] = await Promise.all([
    db.from("plans").select("id,provider_plan_id,type,cost_price,cost_currency,sell_price,is_active,last_synced_at,destination:destinations!plans_destination_id_fkey(slug)").eq("provider", "esimerge"),
    db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
    db.from("app_settings").select("value").eq("key", "vat_rate").maybeSingle(),
    db.from("plans").select("last_synced_at").eq("provider", "esimerge").order("last_synced_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
  ]);
  const vat = typeof vatRow?.value === "number" ? vatRow.value : 0.19;
  const current = latest?.last_synced_at ?? null; // plans missing from the last sync stay as they are
  let changed = 0, activated = 0, hidden = 0;
  for (const p of plans ?? []) {
    if (!p.destination || p.last_synced_at !== current) continue;
    const price = computePrice({ providerPlanId: p.provider_plan_id, destinationSlug: (p.destination as { slug: string }).slug, planType: p.type, costPrice: Number(p.cost_price), costCurrency: p.cost_currency }, (rules ?? []) as PricingRule[], fx.lookup, vat);
    const old = Number(p.sell_price);
    if (!price.ok) {
      if (p.is_active) {
        await db.from("plans").update({ is_active: false }).eq("id", p.id);
        await db.from("audit_log").insert({ actor_id: actorId, action: "plan_hidden_no_price", entity: "plans", entity_id: p.id, meta: { reason: price.reason } as never });
        hidden++;
      }
      continue;
    }
    if (shouldReprice(old, price.gross)) {
      await db.from("plans").update({ sell_price: price.gross, is_active: true }).eq("id", p.id);
      await db.from("audit_log").insert({ actor_id: actorId, action: "price_changed", entity: "plans", entity_id: p.id, meta: { old, new: price.gross } as never });
      changed++;
      if (!p.is_active) activated++;
    } else if (!p.is_active && old > 0) {
      await db.from("plans").update({ is_active: true }).eq("id", p.id);
      activated++;
    }
  }
  return { changed, activated, hidden };
}
