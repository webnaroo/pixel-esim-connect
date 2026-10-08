// Catalog sync: pulls plans from the provider, prices them and upserts into `plans`.
// Safety: aborts without changes if the provider returns < 50 % of previously active plans.
import { evaluateSyncThreshold } from "./admin-rules";
import { computePrice, type PricingRule } from "./pricing";
import { maskSensitive } from "./mask";

export type SyncSummary = { runId: string | null; status: string; message?: string; added: number; updated: number; deactivated: number; unpriced: number };

export async function runCatalogSync(trigger: "cron" | "manual"): Promise<SyncSummary> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { getProvider, providerSetupStatus } = await import("./providers/index.server");
  const empty = { added: 0, updated: 0, deactivated: 0, unpriced: 0 };

  // Simple lock: skip when another run started in the last 15 minutes and has not finished.
  const { data: running } = await db.from("sync_runs").select("id").eq("status", "running").gte("started_at", new Date(Date.now() - 15 * 60_000).toISOString()).limit(1);
  if (running?.length) return { runId: null, status: "skipped", message: "Ein Sync läuft bereits.", ...empty };

  const { data: run } = await db.from("sync_runs").insert({ status: "running" }).select("id").single();
  const runId = run?.id ?? null;
  const finish = async (status: string, fields: Partial<SyncSummary> & { error?: string | null; countries?: number } = {}) => {
    if (runId)
      await db.from("sync_runs").update({
        status,
        finished_at: new Date().toISOString(),
        error: fields.error ?? null,
        countries: fields.countries ?? 0,
        plans_added: fields.added ?? 0,
        plans_updated: fields.updated ?? 0,
        plans_deactivated: fields.deactivated ?? 0,
      }).eq("id", runId);
    await db.from("audit_log").insert({ action: "catalog_sync", entity: "sync_runs", entity_id: runId, meta: { trigger, status } });
  };

  if (!providerSetupStatus().configured) {
    await finish("skipped", { error: "eSIMerge ist noch nicht konfiguriert." });
    return { runId, status: "skipped", message: "eSIMerge ist noch nicht konfiguriert.", ...empty };
  }

  try {
    const fetched = await getProvider().listPlans();
    const { count: previousActive } = await db.from("plans").select("id", { count: "exact", head: true }).eq("provider", "esimerge").eq("is_active", true);
    const threshold = evaluateSyncThreshold(previousActive ?? 0, fetched.length);
    if (threshold.abort) {
      await finish("aborted_threshold", { error: threshold.message ?? null });
      return { runId, status: "aborted_threshold", ...(threshold.message ? { message: threshold.message } : {}), ...empty };
    }

    const [{ data: dests }, { data: rules }, { data: fxRows }, { data: vatRow }, { data: existing }] = await Promise.all([
      db.from("destinations").select("id,type,slug,iso_code,provider_ref"),
      db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
      db.from("fx_rates").select("from_currency,to_currency,rate,valid_from").lte("valid_from", new Date().toISOString()).order("valid_from", { ascending: false }),
      db.from("app_settings").select("value").eq("key", "vat_rate").maybeSingle(),
      db.from("plans").select("provider_plan_id,destination_id").eq("provider", "esimerge"),
    ]);
    const vatRate = typeof vatRow?.value === "number" ? vatRow.value : 0.19;
    const byIso = new Map((dests ?? []).filter((d) => d.iso_code).map((d) => [d.iso_code!.toUpperCase(), d]));
    const byRegion = new Map(
      (dests ?? []).filter((d) => d.type !== "country").map((d) => [String((d.provider_ref as { code?: string } | null)?.code ?? d.slug).toLowerCase(), d]),
    );
    const globalDest = (dests ?? []).find((d) => d.type === "global");
    const fx = (from: string, to: string) => {
      const r = (fxRows ?? []).find((x) => x.from_currency.toUpperCase() === from && x.to_currency.toUpperCase() === to);
      return r ? Number(r.rate) : null;
    };
    const known = new Set((existing ?? []).map((e) => `${e.provider_plan_id}|${e.destination_id}`));
    const startedAt = new Date().toISOString();
    const counts = { added: 0, updated: 0, unpriced: 0 };
    const countries = new Set<string>();

    for (const p of fetched) {
      const dest =
        p.coverage.kind === "country" ? byIso.get((p.coverage.countries[0] ?? "").toUpperCase())
        : p.coverage.kind === "region" ? byRegion.get((p.coverage.regionCode ?? "").toLowerCase())
        : globalDest;
      if (!dest) continue;
      countries.add(dest.id);
      const price = computePrice(
        { providerPlanId: p.providerPlanId, destinationSlug: dest.slug, planType: p.type, costPrice: p.costPrice, costCurrency: p.costCurrency },
        (rules ?? []) as PricingRule[], fx, vatRate,
      );
      if (!price.ok) counts.unpriced++;
      const row = {
        provider: "esimerge",
        provider_plan_id: p.providerPlanId,
        destination_id: dest.id,
        type: p.type,
        data_mb: p.dataMb,
        validity_days: p.validityDays,
        network_type: p.networkType ?? null,
        networks: p.networks ?? null,
        hotspot: p.hotspot ?? null,
        voice_sms: (p.voiceSms ?? null) as never,
        fair_use: (p.fairUse ?? null) as never,
        top_upable: p.topUpable ?? null,
        cost_price: p.costPrice,
        cost_currency: p.costCurrency,
        // Without a valid price the plan stays inactive — never show a wrong price.
        sell_price: price.ok ? price.gross : 0,
        currency: "EUR",
        is_active: price.ok,
        raw: maskSensitive(p.raw ?? null) as never,
        last_synced_at: startedAt,
      };
      const { error } = await db.from("plans").upsert(row, { onConflict: "provider,provider_plan_id,destination_id" });
      if (error) throw new Error(`Upsert fehlgeschlagen: ${error.message}`);
      if (known.has(`${p.providerPlanId}|${dest.id}`)) counts.updated++;
      else counts.added++;
    }

    const { data: gone } = await db.from("plans").update({ is_active: false }).eq("provider", "esimerge").eq("is_active", true).or(`last_synced_at.is.null,last_synced_at.lt.${startedAt}`).select("id");
    const summary = { ...counts, deactivated: gone?.length ?? 0 };
    const note = counts.unpriced ? `${counts.unpriced} Tarife ohne Preis (Wechselkurs oder Margenregel fehlt) bleiben inaktiv.` : null;
    await finish(note ? "ok_with_warnings" : "ok", { ...summary, countries: countries.size, error: note });
    return { runId, status: note ? "ok_with_warnings" : "ok", ...(note ? { message: note } : {}), ...summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    await finish("failed", { error: msg.slice(0, 500) });
    return { runId, status: "failed", message: msg, ...empty };
  }
}
