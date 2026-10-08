import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canEnableShop, shopChecklistMissing, type ShopChecklist } from "./admin-rules";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}

async function buildChecklist(): Promise<ShopChecklist & { providerMessage: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getProvider, providerSetupStatus } = await import("./providers/index.server");
  const status = providerSetupStatus();
  let providerReachable = false;
  let providerMessage = "eSIMerge ist noch nicht konfiguriert.";
  if (status.configured) {
    try {
      const h = await getProvider().ping();
      providerReachable = h.ok;
      providerMessage = h.ok ? `Erreichbar (${h.latencyMs} ms)` : (h.message ?? "Nicht erreichbar");
    } catch (e) {
      providerMessage = e instanceof Error ? e.message : "Nicht erreichbar";
    }
  }
  const { count } = await supabaseAdmin.from("plans").select("id", { count: "exact", head: true }).eq("is_active", true);
  const stripeConfigured = Boolean(process.env["STRIPE_LIVE_API_KEY"] && process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"]) // live payments, not the test environment;
  const [{ data: mail }, { count: unpublished }] = await Promise.all([
    supabaseAdmin.from("app_settings").select("value").eq("key", "email_settings").maybeSingle(),
    supabaseAdmin.from("legal_pages").select("slug", { count: "exact", head: true }).eq("published", false),
  ]);
  const { canSendCustomerEmail, parseEmailSettings } = await import("./email-rules");
  const emailVerified = canSendCustomerEmail(parseEmailSettings(mail?.value));
  const { loadFx } = await import("./fx.server");
  const fx = await loadFx(supabaseAdmin);
  const fxValid = fx.effective("USD") !== null;
  return { providerReachable, providerSandbox: status.sandbox, providerMessage, catalogCount: count ?? 0, stripeConfigured, emailVerified, fxValid, legalPublished: (unpublished ?? 0) === 0 };
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { providerSetupStatus } = await import("./providers/index.server");
    const [checklist, { data: settings }, { data: runs }] = await Promise.all([
      buildChecklist(),
      supabaseAdmin.from("app_settings").select("key,value").in("key", ["shop_enabled", "catalog_sync_enabled"]),
      supabaseAdmin.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    const s = providerSetupStatus();
    const get = (k: string) => settings?.find((x) => x.key === k)?.value === true;
    return {
      checklist,
      missing: shopChecklistMissing(checklist),
      shopEnabled: get("shop_enabled"),
      syncEnabled: get("catalog_sync_enabled"),
      provider: { baseUrlSet: s.baseUrlSet, apiKeySet: s.apiKeySet, webhookSecretSet: s.webhookSecretSet, configMissing: s.configMissing, mappingReady: s.mappingReady, sandbox: s.sandbox },
      runs: (runs ?? []).map((r) => ({ ...r })),
    };
  });

export const adminOverviewQuery = () => queryOptions({ queryKey: ["admin", "overview"], queryFn: () => getAdminOverview() });

export const setShopEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.enabled) {
      const c = await buildChecklist();
      if (!canEnableShop(c)) return { ok: false as const, missing: shopChecklistMissing(c) };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: "shop_enabled", value: data.enabled, updated_at: new Date().toISOString() });
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: data.enabled ? "shop_enabled" : "shop_disabled", entity: "app_settings", entity_id: "shop_enabled" });
    return { ok: true as const, missing: [] as string[] };
  });

export const setSyncEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { error } = await context.supabase.from("app_settings").upsert({ key: "catalog_sync_enabled", value: data.enabled, updated_at: new Date().toISOString() });
    if (error) throw new Error("Speichern fehlgeschlagen.");
    return { ok: true };
  });

export const runSyncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { runCatalogSync } = await import("./catalog-sync.server");
    return runCatalogSync("manual");
  });

// ---------- Pricing ----------
export const getPricingData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const [{ data: rules }, { data: fx }] = await Promise.all([
      context.supabase.from("pricing_rules").select("*").order("priority", { ascending: false }),
      context.supabase.from("fx_rates").select("*").order("valid_from", { ascending: false }).limit(50),
    ]);
    return { rules: (rules ?? []).map((r) => ({ ...r, value: Number(r.value) })), fx: (fx ?? []).map((r) => ({ ...r, rate: Number(r.rate) })) };
  });

export const pricingQuery = () => queryOptions({ queryKey: ["admin", "pricing"], queryFn: () => getPricingData() });

const ruleSchema = z.object({
  scope: z.enum(["global", "plan_type", "country", "plan"]),
  scope_ref: z.string().trim().max(120).nullable(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(-100).max(10000),
  rounding: z.enum(["49_99", "none"]),
  priority: z.number().int().min(-1000).max(1000),
}).refine((r) => r.scope === "global" || (r.scope_ref && r.scope_ref.length > 0), { message: "Bezug fehlt" });

export const savePricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ruleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { error } = await context.supabase.from("pricing_rules").insert({ ...data, scope_ref: data.scope === "global" ? null : data.scope_ref });
    if (error) throw new Error("Regel konnte nicht gespeichert werden.");
    return { ok: true };
  });

export const deletePricingRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    await context.supabase.from("pricing_rules").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- API explorer (read-only endpoints, masked output) ----------
const READ_ONLY = ["ping", "listCountries", "listRegions", "listPlans", "getPlan", "checkAvailability", "getEsim", "getUsage"] as const;

export const explorerEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { esimergeConfig } = await import("./providers/esimerge/config");
    return READ_ONLY.map((name) => ({ name, configured: Boolean(esimergeConfig.endpoints[name]), method: esimergeConfig.endpoints[name]?.method ?? null, path: esimergeConfig.endpoints[name]?.path ?? null }));
  });

export const explorerCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ endpoint: z.enum(READ_ONLY), params: z.record(z.string(), z.string().max(200)).default({}) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { esimergeConfig } = await import("./providers/esimerge/config");
    const { providerRequest } = await import("./providers/esimerge/client.server");
    const { maskSensitive, maskString } = await import("./mask");
    try {
      const r = await providerRequest(data.endpoint, esimergeConfig.endpoints[data.endpoint], { params: data.params });
      return { ok: true as const, status: r.status, latencyMs: r.latencyMs, body: JSON.stringify(maskSensitive(r.body), null, 2).slice(0, 200_000) };
    } catch (e) {
      const code = (e as { code?: string }).code ?? "E-UNKNOWN";
      return { ok: false as const, code, message: maskString(e instanceof Error ? e.message : String(e)) };
    }
  });

// ---- Unlimited-Prüfung ("ohne Drosselung") ----
export const getThrottleReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    // plans is closed to client roles (cost prices, raw provider text); read it server-side after the admin check.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: plans, error }, { data: texts }] = await Promise.all([
      supabaseAdmin.from("plans").select("id,provider_plan_id,validity_days,is_active,fair_use,hotspot,throttle_claim,throttle_confirmation,destination:destinations(name_de)").eq("type", "unlimited").order("provider_plan_id"),
      context.supabase.from("app_settings").select("value").eq("key", "unlimited_claim").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    return { plans: plans ?? [], texts: (texts?.value ?? null) as { label?: string; qualifier?: string; note?: string } | null };
  });
export const throttleReviewQuery = () => queryOptions({ queryKey: ["admin", "throttle"], queryFn: () => getThrottleReview() });

export const confirmNoThrottle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ planIds: z.array(z.string().uuid()).min(1).max(500), source: z.string().max(500), date: z.string().max(10), acceptHint: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { validateConfirmation, confirmClaim } = await import("./throttle");
    const err = validateConfirmation(data.source, data.date, new Date());
    if (err) throw new Error(err);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plans } = await supabaseAdmin.from("plans").select("id,type,fair_use").in("id", data.planIds);
    const result = { confirmed: 0, conflict: 0 };
    for (const p of plans ?? []) {
      if (p.type !== "unlimited") continue;
      const r = confirmClaim(p.fair_use as never, { source: data.source, date: data.date, confirmedBy: context.userId, acceptHint: data.acceptHint });
      await supabaseAdmin.from("plans").update({ throttle_claim: r.claim, throttle_confirmation: r.confirmation as never }).eq("id", p.id);
      await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: r.claim === "none_confirmed" ? "throttle_confirmed" : "throttle_conflict", entity: "plans", entity_id: p.id, meta: { ...r.confirmation, fair_use: p.fair_use } as never });
      result[r.claim === "none_confirmed" ? "confirmed" : "conflict"]++;
    }
    return result;
  });

export const revokeNoThrottle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ planIds: z.array(z.string().uuid()).min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("plans").update({ throttle_claim: "unknown" }).in("id", data.planIds);
    await supabaseAdmin.from("audit_log").insert(data.planIds.map((id) => ({ actor_id: context.userId, action: "throttle_revoked", entity: "plans", entity_id: id })));
    return { ok: true };
  });

export const saveUnlimitedClaimTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ label: z.string().trim().min(2).max(60), qualifier: z.string().trim().max(60), note: z.string().trim().max(600) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { error } = await context.supabase.from("app_settings").upsert({ key: "unlimited_claim", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error("Speichern fehlgeschlagen.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: "unlimited_claim_texts", entity: "app_settings", entity_id: "unlimited_claim", meta: data });
    return { ok: true };
  });
