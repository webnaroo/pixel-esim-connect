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

async function buildChecklist(): Promise<ShopChecklist & { providerMessage: string; stripeMode: "live" | "test"; stripeLiveEvents: number; senderDomain: string }> {
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
  const { stripeLiveMissing, stripeMode } = await import("./golive-rules");
  const { count: liveEvents } = await supabaseAdmin.from("webhook_events").select("id", { count: "exact", head: true }).eq("source", "stripe").like("event_id", "live:%").not("processed_at", "is", null);
  const stripe = { liveKey: Boolean(process.env["STRIPE_LIVE_API_KEY"]), liveSecret: Boolean(process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"]), liveEventsProcessed: liveEvents ?? 0 };
  const stripeMissing = stripeLiveMissing(stripe);
  const stripeConfigured = stripeMissing.length === 0;
  const [{ data: mail }, { count: unpublished }] = await Promise.all([
    supabaseAdmin.from("app_settings").select("value").eq("key", "email_settings").maybeSingle(),
    supabaseAdmin.from("legal_pages").select("slug", { count: "exact", head: true }).eq("published", false),
  ]);
  const { canSendCustomerEmail, parseEmailSettings } = await import("./email-rules");
  const mailSettings = parseEmailSettings(mail?.value);
  const emailVerified = canSendCustomerEmail(mailSettings);
  const emailTestSent = mailSettings.test_result?.ok === true;
  const replyConfirmed = Boolean(mailSettings.reply_confirmed_at);
  const { loadFx } = await import("./fx.server");
  const fx = await loadFx(supabaseAdmin);
  const fxValid = fx.effective("USD") !== null;
  const { WEBHOOK_READY_STATUSES } = await import("./webhook-labels");
  const { count: whOk } = await supabaseAdmin.from("provider_webhook_events").select("id", { count: "exact", head: true }).eq("signature_valid", true).eq("mode", status.sandbox ? "sandbox" : "live").in("status", [...WEBHOOK_READY_STATUSES]);
  const webhookReady = status.webhookSecretSet && (whOk ?? 0) > 0;
  const { data: pause } = await supabaseAdmin.from("app_settings").select("value").eq("key", "sales_pause").maybeSingle();
  const p = (pause?.value ?? {}) as { active?: boolean; reason?: string };
  const providerAuthOk = !(p.active && p.reason === "auth");
  return {
    providerAuthOk, providerReachable, providerSandbox: status.sandbox, providerMessage, catalogCount: count ?? 0, stripeConfigured, stripeMissing, stripeMode: stripeMode(stripe), stripeLiveEvents: stripe.liveEventsProcessed, emailVerified, emailTestSent, replyConfirmed, senderDomain: mailSettings.sender_domain, fxValid, webhookReady, legalPublished: (unpublished ?? 0) === 0 };
}

export { buildChecklist };

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { providerSetupStatus } = await import("./providers/index.server");
    const [checklist, { data: settings }, { data: runs }] = await Promise.all([
      buildChecklist(),
      supabaseAdmin.from("app_settings").select("key,value").in("key", ["shop_enabled", "catalog_sync_enabled", "sales_pause", "auto_refund_enabled"]),
      supabaseAdmin.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    const s = providerSetupStatus();
    const whStat = async (mode: "sandbox" | "live") => {
      const [{ count }, { data: last }] = await Promise.all([
        supabaseAdmin.from("provider_webhook_events").select("id", { count: "exact", head: true }).eq("mode", mode).eq("signature_valid", true),
        supabaseAdmin.from("provider_webhook_events").select("received_at,status,event_type").eq("mode", mode).eq("signature_valid", true).order("received_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { count: count ?? 0, last: last ?? null };
    };
    const [whSandbox, whLive, { data: lastSync }] = await Promise.all([
      whStat("sandbox"), whStat("live"),
      supabaseAdmin.from("sync_runs").select("finished_at,status").not("finished_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const get = (k: string) => settings?.find((x) => x.key === k)?.value === true;
    return {
      checklist,
      missing: shopChecklistMissing(checklist),
      shopEnabled: get("shop_enabled"),
      syncEnabled: get("catalog_sync_enabled"),
      autoRefundEnabled: get("auto_refund_enabled"),
      salesPause: (() => {
        const v = (settings?.find((x) => x.key === "sales_pause")?.value ?? {}) as { active?: boolean; reason?: string; since?: string; code?: string; request_id?: string };
        return v.active ? { reason: v.reason === "auth" ? "auth" as const : "insufficient_funds" as const, since: v.since ?? null, code: v.code ?? null, requestId: v.request_id ?? null } : null;
      })(),
      provider: { baseUrlSet: s.baseUrlSet, apiKeySet: s.apiKeySet, webhookSecretSet: s.webhookSecretSet, configMissing: s.configMissing, mappingReady: s.mappingReady, sandbox: s.sandbox,
        webhook: { sandbox: { secretSet: s.webhookSecretSandboxSet, ...whSandbox }, live: { secretSet: s.webhookSecretLiveSet, ...whLive } },
        lastSync: lastSync ?? null },
      runs: (runs ?? []).map((r) => ({ ...r })),
    };
  });

export const adminOverviewQuery = () => queryOptions({ queryKey: ["admin", "overview"], queryFn: () => getAdminOverview() });

export const setShopEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ enabled: z.boolean(), confirmation: z.string().max(60).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.enabled) {
      const c = await buildChecklist();
      if (!canEnableShop(c)) return { ok: false as const, missing: shopChecklistMissing(c) };
      const { canSwitchShopOn } = await import("./golive-wizard");
      if (!canSwitchShopOn([], data.confirmation)) return { ok: false as const, missing: ["ausdrückliche Bestätigung im Go-Live-Assistenten"] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: "shop_enabled", value: data.enabled, updated_at: new Date().toISOString() });
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: data.enabled ? "shop_enabled" : "shop_disabled", entity: "app_settings", entity_id: "shop_enabled" });
    return { ok: true as const, missing: [] as string[] };
  });

/** Lifts the sales pause after an admin confirmed the cause is fixed (balance topped up / key replaced). Audited. */
export const releaseSalesPause = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ confirmed: z.literal(true) }).parse(i))
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin.from("app_settings").select("value").eq("key", "sales_pause").maybeSingle();
    const now = new Date().toISOString();
    await supabaseAdmin.from("app_settings").upsert([{ key: "sales_paused", value: false, updated_at: now }, { key: "sales_pause", value: { active: false }, updated_at: now }]);
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: "sales_released", entity: "app_settings", entity_id: "sales_pause", meta: { previous: prev?.value ?? null } as never });
    return { ok: true as const };
  });

export const setAutoRefundEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: "auto_refund_enabled", value: data.enabled, updated_at: new Date().toISOString() });
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: data.enabled ? "auto_refund_enabled" : "auto_refund_disabled", entity: "app_settings", entity_id: "auto_refund_enabled" });
    return { ok: true as const };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: st } = await supabaseAdmin.from("app_settings").select("key,value").in("key", ["stripe_fees", "min_net_result", "vat_rate"]);
    const val = (k: string) => st?.find((x) => x.key === k)?.value;
    const { parseFeeSettings, parseMinNet } = await import("./pricing");
    const vat = Number(val("vat_rate"));
    const { providerSetupStatus } = await import("./providers/index.server");
    const { data: lastCalculation } = await supabaseAdmin.from("audit_log").select("created_at,meta").eq("action", "prices_recalculated").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return {
      mode: providerSetupStatus().sandbox ? "TEST/VORSCHAU" : "LIVE", lastCalculation,
      history: (await supabaseAdmin.from("audit_log").select("created_at,actor_id,meta").eq("action", "prices_recalculated").order("created_at", { ascending: false }).limit(10)).data ?? [],
      rules: (rules ?? []).map((r) => ({ ...r, value: Number(r.value) })), fx: (fx ?? []).map((r) => ({ ...r, rate: Number(r.rate) })),
      fees: parseFeeSettings(val("stripe_fees")), minNet: parseMinNet(val("min_net_result")), vatRate: Number.isFinite(vat) && vat > 0 ? vat : 0.19,
    };
  });

export const pricingQuery = () => queryOptions({ queryKey: ["admin", "pricing"], queryFn: () => getPricingData() });

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

export const getWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { providerSetupStatus } = await import("./providers/index.server");
    const { data } = await supabaseAdmin.from("provider_webhook_events").select("id,event_id,delivery_id,event_type,mode,status,error,order_id,received_at,processed_at").order("received_at", { ascending: false }).limit(200);
    // Provider alerts for the admin: failed / cancelled orders and purchase-price deviations.
    const { data: alerts } = await supabaseAdmin.from("audit_log").select("id,action,entity_id,meta,created_at").in("action", ["provider_order_failed", "provider_order_cancelled", "cost_mismatch", "provider_error", "plan_unavailable", "auto_refunded", "auto_refund_failed"]).order("created_at", { ascending: false }).limit(50);
    const { ORDER_PAST_ISSUED } = await import("./webhook-labels");
    const ids = [...new Set([...(data ?? []).map((e) => e.order_id), ...(alerts ?? []).map((a) => a.entity_id)].filter(Boolean) as string[])];
    const { data: os } = ids.length ? await supabaseAdmin.from("orders").select("id,status").in("id", ids) : { data: [] };
    const { data: es } = ids.length ? await supabaseAdmin.from("esims").select("order_id,provider_order_id").in("order_id", ids).not("provider_order_id", "is", null) : { data: [] };
    const past = new Set([...(os ?? []).filter((o) => ORDER_PAST_ISSUED.includes(o.status)).map((o) => o.id), ...(es ?? []).map((e) => e.order_id)]);
    const evIds = (data ?? []).map((e) => e.id);
    const { data: res } = evIds.length ? await supabaseAdmin.from("audit_log").select("entity_id,created_at,meta").eq("action", "webhook_event_resolved").in("entity_id", evIds) : { data: [] };
    const resolved = new Map((res ?? []).map((r) => [r.entity_id, r]));
    const alertIds = (alerts ?? []).map((a) => a.id);
    const { data: dismissedRows } = alertIds.length ? await supabaseAdmin.from("audit_log").select("entity_id").eq("action", "provider_alert_dismissed").in("entity_id", alertIds) : { data: [] };
    const dismissed = new Set((dismissedRows ?? []).map((d) => d.entity_id));
    const live = (alerts ?? []).filter((a) => !dismissed.has(a.id) && !((a.meta as { code?: string } | null)?.code === "request_in_flight" && a.entity_id && past.has(a.entity_id)));
    return {
      secretSet: providerSetupStatus().webhookSecretSet,
      events: (data ?? []).map((e) => { const r = resolved.get(e.id); return { ...e, resolved_at: r?.created_at ?? null, resolved_note: r ? String((r.meta as { note?: string } | null)?.note ?? "") : null }; }),
      alerts: live.map((a) => ({ id: a.id, action: a.action, orderId: a.entity_id, message: String((a.meta as { message?: string } | null)?.message ?? ""), code: ((a.meta as { code?: string } | null)?.code ?? null) as string | null, requestId: ((a.meta as { request_id?: string } | null)?.request_id ?? null) as string | null, field: ((a.meta as { field?: string } | null)?.field ?? null) as string | null, createdAt: a.created_at })),
    };
  });

export const resolveWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ eventId: z.string().uuid(), note: z.string().trim().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: e } = await supabaseAdmin.from("provider_webhook_events").select("id").eq("id", data.eventId).maybeSingle();
    if (!e) throw new Error("Ereignis nicht gefunden.");
    await supabaseAdmin.from("audit_log").insert({ actor_id: context.userId, action: "webhook_event_resolved", entity: "provider_webhook_event", entity_id: data.eventId, meta: { note: data.note } });
    return { ok: true };
  });

// Hides provider alerts from the admin list. The audit_log rows stay untouched; a dismissal is a new audit entry.
export const dismissProviderAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ alertIds: z.array(z.string().uuid()).min(1).max(50) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: found } = await supabaseAdmin.from("audit_log").select("id").in("id", data.alertIds);
    const ids = (found ?? []).map((a) => a.id);
    if (ids.length === 0) return { ok: true, dismissed: 0 };
    await supabaseAdmin.from("audit_log").insert(ids.map((id) => ({ actor_id: context.userId, action: "provider_alert_dismissed", entity: "audit_log", entity_id: id })));
    return { ok: true, dismissed: ids.length };
  });

export const webhookEventsQuery = () => queryOptions({ queryKey: ["admin", "webhooks"], queryFn: () => getWebhookEvents() });
