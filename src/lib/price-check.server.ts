// Price check data (shared by admin price list and go-live assistant).
export async function getPriceCheckData() {
  const db = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const [{ data: plans }, { data: rules }, { data: st }, { data: run }, { data: orders }] = await Promise.all([
      db.from("plans").select("id,provider_plan_id,type,data_mb,validity_days,cost_price,cost_currency,destination_id,is_active,released,last_synced_at,destination:destinations(slug,name_de,iso_code)").eq("provider", "esimerge"),
      db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
      db.from("app_settings").select("key,value").in("key", ["stripe_fees", "vat_rate"]),
      db.from("sync_runs").select("id,started_at,unmapped,stats").not("finished_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("orders").select("plan_id,cost_amount,cost_currency,created_at").eq("status", "fulfilled").not("cost_amount", "is", null).order("created_at", { ascending: false }).limit(500),
    ]);
    const { loadFx } = await import("./fx.server");
    const fx = await loadFx(db);
    const { parseFeeSettings } = await import("./pricing");
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
        return { id: p.id, providerPlanId: p.provider_plan_id, type: p.type, dataMb: p.data_mb, validityDays: p.validity_days, costPrice: p.cost_price != null ? Number(p.cost_price) : null, costCurrency: p.cost_currency, destinationId: p.destination_id, destinationSlug: d?.slug ?? null, destinationName: d?.name_de ?? null, iso: d?.iso_code?.toUpperCase() ?? null, isActive: p.is_active, released: p.released };
      }),
      rules: (rules ?? []).map((x) => ({ ...x, value: Number(x.value) })), fx: fx.lookup, vat: Number.isFinite(vat) && vat > 0 ? vat : 0.19, fees,
      lastPaid, unmapped: (run?.unmapped ?? []) as { providerPlanId: string | null; reason: string }[], newIds: stats.newIds ?? [], goneIds: stats.goneIds ?? [],
    });
    return { ...r, fees, lastSync: run?.started_at ?? null };
}
