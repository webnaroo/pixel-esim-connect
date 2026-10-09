import { claimAfterSync, type FairUse, type ThrottleConfirmation } from "./throttle";
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

  // Runs killed by the worker time limit never finish; mark them failed after 15 minutes.
  await db.from("sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: "Abgebrochen (Zeitlimit)" }).eq("status", "running").lt("started_at", new Date(Date.now() - 15 * 60_000).toISOString());
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
    const provider = getProvider();
    const detailed = provider.listPlansDetailed ? await provider.listPlansDetailed() : { plans: await provider.listPlans(), unmapped: [] };
    const fetched = detailed.plans;
    const unmapped: { providerPlanId: string | null; reason: string }[] = [...detailed.unmapped];
    const { count: previousActive } = await db.from("plans").select("id", { count: "exact", head: true }).eq("provider", "esimerge").eq("is_active", true);
    const threshold = evaluateSyncThreshold(previousActive ?? 0, fetched.length);
    if (threshold.abort) {
      await finish("aborted_threshold", { error: threshold.message ?? null });
      return { runId, status: "aborted_threshold", ...(threshold.message ? { message: threshold.message } : {}), ...empty };
    }

    const { loadPricingContext } = await import("./pricing-context.server");
    const pricing = await loadPricingContext(db);
    const { data: dests, error: destError } = await db.from("destinations").select("id,type,slug,iso_code,provider_ref");
    if (destError) throw new Error("Reiseziele konnten nicht geladen werden.");
    const existing = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from("plans").select("provider_plan_id,destination_id,price_override,sell_price,is_active").eq("provider", "esimerge").order("id").range(from, from + 499);
      if (error) throw new Error("Bestehende Tarife konnten nicht vollständig geladen werden.");
      existing.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    const byIso = new Map((dests ?? []).filter((d) => d.type === "country" && d.iso_code).map((d) => [d.iso_code?.toUpperCase(), d]));
    const byRegion = new Map((dests ?? []).filter((d) => d.type === "region").map((d) => [String((d.provider_ref as { code?: string } | null)?.code ?? d.iso_code ?? d.slug).toUpperCase(), d]));
    const globalDest = (dests ?? []).find((d) => d.type === "global");
    const known = new Map(existing.map((e) => [`${e.provider_plan_id}|${e.destination_id}`, e]));
    const startedAt = new Date().toISOString();
    const counts = { added: 0, updated: 0, unpriced: 0 };
    const missingFx = new Set<string>();
    const typeCount = { data: 0, unlimited: 0 };
    const countries = new Set<string>();
    const newIds: string[] = [];
    const rows: Array<Record<string, unknown> & { provider_plan_id: string; destination_id: string }> = [];

    for (const p of fetched) {
      const dest =
        p.coverage.kind === "country" ? byIso.get((p.coverage.countries[0] ?? "").toUpperCase())
        : p.coverage.kind === "region" ? byRegion.get((p.coverage.regionCode ?? "").toUpperCase())
        : globalDest;
      if (!dest) {
        unmapped.push({ providerPlanId: p.providerPlanId, reason: p.coverage.kind === "country" ? `Kein Reiseziel für Land ${p.coverage.countries[0]}` : p.coverage.kind === "region" ? `Keine Region für Code ${p.coverage.regionCode}` : "Kein globales Reiseziel" });
        continue;
      }
      countries.add(dest.id);
      const previous = known.get(`${p.providerPlanId}|${dest.id}`);
      const calculation = pricing.calculate({ providerPlanId: p.providerPlanId, destinationSlug: dest.slug, planType: p.type, costPrice: p.costPrice, costCurrency: p.costCurrency, manualPrice: previous?.price_override });
      const price = calculation.price;
      if (!price.ok) {
        counts.unpriced++;
        if (price.reason === "missing_fx") missingFx.add(p.costCurrency);
      }
      typeCount[p.type]++;
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
        sell_price: price.ok ? price.gross : previous?.sell_price ?? 0,
        price_override: previous?.price_override ?? null,
        ...(price.ok ? { price_source: calculation.source, price_inputs: calculation.inputs, price_calculated_at: new Date().toISOString() } : {}),
        currency: "EUR",
        is_active: previous?.is_active ?? price.ok,
        raw: maskSensitive(p.raw ?? null) as never,
        last_synced_at: startedAt,
      };
      rows.push(row);
    }

    // Batched upserts: the live catalog has >10 000 plans; one request per plan exceeds the worker time limit.
    const uniq = new Map(rows.map((r) => [`${r.provider_plan_id}|${r.destination_id}`, r]));
    const all = [...uniq.values()];
    for (let i = 0; i < all.length; i += 500) {
      const { data: ups, error } = await db.from("plans").upsert(all.slice(i, i + 500) as never, { onConflict: "provider,provider_plan_id,destination_id" }).select("id,provider_plan_id,destination_id");
      if (error) throw new Error(`Upsert fehlgeschlagen: ${error.message}`);
      for (const up of ups ?? []) {
        if (known.has(`${up.provider_plan_id}|${up.destination_id}`)) counts.updated++;
        else { counts.added++; newIds.push(up.id); } // new plans stay hidden (released=false) until the admin releases them
      }
    }

    // Provider hint vs. "ohne Drosselung" confirmation: never silently keep the claim.
    const { data: confirmed } = await db.from("plans").select("id,fair_use,throttle_confirmation").eq("provider", "esimerge").eq("throttle_claim", "none_confirmed");
    for (const c of confirmed ?? []) {
      if (claimAfterSync("none_confirmed", c.throttle_confirmation as ThrottleConfirmation | null, c.fair_use as FairUse) === "conflict") {
        await db.from("plans").update({ throttle_claim: "conflict" }).eq("id", c.id);
        await db.from("audit_log").insert({ action: "throttle_conflict", entity: "plans", entity_id: c.id, meta: { fair_use: c.fair_use } as never });
      }
    }

    const { data: gone } = await db.from("plans").update({ is_active: false }).eq("provider", "esimerge").eq("is_active", true).or(`last_synced_at.is.null,last_synced_at.lt.${startedAt}`).select("id");
    const summary = { ...counts, deactivated: gone?.length ?? 0 };
    const notes = [
      counts.unpriced ? `${counts.unpriced} Tarife ohne Preis bleiben inaktiv${missingFx.size ? ` (Wechselkurs ${[...missingFx].map((c) => `${c}→EUR`).join(", ")} fehlt)` : " (Margenregel fehlt)"}.` : null,
      unmapped.length ? `${unmapped.length} Tarife nicht zuordenbar.` : null,
    ].filter(Boolean);
    const note = notes.length ? notes.join(" ") : null;
    if (runId) await db.from("sync_runs").update({ unmapped: unmapped as never, stats: { plans: fetched.length, ...typeCount, missingFx: [...missingFx], newIds, goneIds: (gone ?? []).map((g) => g.id) } as never }).eq("id", runId);
    await finish(note ? "ok_with_warnings" : "ok", { ...summary, countries: countries.size, error: note });
    return { runId, status: note ? "ok_with_warnings" : "ok", ...(note ? { message: note } : {}), ...summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    await finish("failed", { error: msg.slice(0, 500) });
    return { runId, status: "failed", message: msg, ...empty };
  }
}
