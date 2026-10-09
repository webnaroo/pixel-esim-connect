// Price check data (shared by admin price list and go-live assistant).
export async function getPriceCheckData() {
  const db = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [{ data: rules }, { data: st }, { data: run }, { data: orders }] = await Promise.all([
      db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
      db.from("app_settings").select("key,value").in("key", ["stripe_fees", "vat_rate", "min_net_result"]),
      db.from("sync_runs").select("id,started_at,unmapped,stats").not("finished_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("orders").select("plan_id,cost_amount,cost_currency,created_at").eq("status", "fulfilled").not("cost_amount", "is", null).order("created_at", { ascending: false }).limit(500),
    ]);
    const plans = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from("plans").select("id,provider_plan_id,type,data_mb,validity_days,cost_price,cost_currency,destination_id,is_active,released,last_synced_at,sell_price,price_override,price_source,price_calculated_at,price_inputs,destination:destinations(slug,name_de,iso_code)").eq("provider", "esimerge").order("id").range(from, from + 499);
      if (error) throw new Error("Preisprüfliste konnte nicht vollständig geladen werden.");
      plans.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    const { loadFx } = await import("./fx.server");
    const fx = await loadFx(db);
    const { parseFeeSettings, parseMinNet } = await import("./pricing");
    const { buildPriceCheck } = await import("./golive-rules");
    const val = (k: string) => st?.find((x) => x.key === k)?.value;
    const vat = Number(val("vat_rate"));
    const byPlanId = new Map((plans ?? []).map((p) => [p.id, p.provider_plan_id]));
    const lastPaid: Record<string, number> = {};
    for (const o of orders ?? []) {
      const pid = o.plan_id ? byPlanId.get(o.plan_id) : undefined;
      if (pid && !(pid in lastPaid) && (o.cost_currency ?? "USD") === "USD") lastPaid[pid] = Number(o.cost_amount);
    }
    const stats = (run?.stats ?? {}) as { newIds?: string[]; goneIds?: string[] };
    const fees = parseFeeSettings(val("stripe_fees"));
    const r = buildPriceCheck({
      plans: (plans ?? []).map((p) => {
        const d = p.destination as { slug: string; name_de: string; iso_code: string | null } | null;
        return { id: p.id, providerPlanId: p.provider_plan_id, type: p.type, dataMb: p.data_mb, validityDays: p.validity_days, costPrice: p.cost_price != null ? Number(p.cost_price) : null, costCurrency: p.cost_currency, destinationId: p.destination_id, destinationSlug: d?.slug ?? null, destinationName: d?.name_de ?? null, iso: d?.iso_code?.toUpperCase() ?? null, isActive: p.is_active, released: p.released, storedGross: p.sell_price, manualPrice: p.price_override, priceSource: p.price_source, calculatedAt: p.price_calculated_at, priceInputs: p.price_inputs };
      }),
      rules: (rules ?? []).map((x) => ({ ...x, value: Number(x.value) })), fx: fx.lookup, vat: Number.isFinite(vat) && vat > 0 ? vat : 0.19, fees,
      minNet: parseMinNet(val("min_net_result")), lastPaid, unmapped: (run?.unmapped ?? []) as { providerPlanId: string | null; reason: string }[], newIds: stats.newIds ?? [], goneIds: stats.goneIds ?? [],
    });
    return { ...r, fees, lastSync: run?.started_at ?? null };
}
