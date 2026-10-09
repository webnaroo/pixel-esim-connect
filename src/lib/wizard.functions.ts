// Go-live assistant server functions. Returns only presence/state flags — never secret values.
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string; claims?: { email?: string } };
async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}
const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

type WizardState = { done: Record<string, string>; confirmations: Record<string, string>; autoRefundDecision?: "on" | "off"; shopEnabledAt?: string };
async function loadState(): Promise<WizardState> {
  const { data } = await (await db()).from("app_settings").select("value").eq("key", "golive_wizard").maybeSingle();
  const v = (data?.value ?? {}) as Partial<WizardState>;
  return { done: v.done ?? {}, confirmations: v.confirmations ?? {}, ...(v.autoRefundDecision ? { autoRefundDecision: v.autoRefundDecision } : {}), ...(v.shopEnabledAt ? { shopEnabledAt: v.shopEnabledAt } : {}) };
}
async function saveState(s: WizardState) {
  await (await db()).from("app_settings").upsert({ key: "golive_wizard", value: s as never, updated_at: new Date().toISOString() });
}
async function audit(actor: string, action: string, meta: Record<string, unknown>) {
  await (await db()).from("audit_log").insert({ actor_id: actor, action, entity: "golive", entity_id: String(meta["step"] ?? ""), meta: { ...meta, at: new Date().toISOString() } as never });
}

async function collectFacts(state: WizardState) {
  const a = await db();
  const { providerSetupStatus, getProvider } = await import("./providers/index.server");
  const s = providerSetupStatus();
  let pingOk = false, pingMessage = "nicht geprüft";
  if (s.apiKeySet && !s.sandbox && s.configured) {
    try { const h = await getProvider().ping(); pingOk = h.ok; pingMessage = h.ok ? `erreichbar (${h.latencyMs} ms)` : (h.message ?? "nicht erreichbar"); }
    catch (e) { pingMessage = e instanceof Error ? e.message.slice(0, 160) : "Fehler"; }
  }
  const since10 = new Date(Date.now() - 10 * 60_000).toISOString();
  const [{ count: liveValid }, { count: r401 }, { data: lastRun }, { count: activePlans }, { data: dests }, { count: stripeLive }] = await Promise.all([
    a.from("provider_webhook_events").select("id", { count: "exact", head: true }).eq("mode", "live").eq("signature_valid", true),
    a.from("api_logs").select("id", { count: "exact", head: true }).eq("provider", "esimerge-webhook").eq("status", 401).gte("created_at", since10),
    a.from("sync_runs").select("status,finished_at,countries").not("finished_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    a.from("plans").select("id", { count: "exact", head: true }).eq("provider", "esimerge").eq("is_active", true),
    a.from("plans").select("destination_id").eq("provider", "esimerge").eq("is_active", true),
    a.from("webhook_events").select("id", { count: "exact", head: true }).eq("source", "stripe").like("event_id", "live:%").not("processed_at", "is", null),
  ]);
  // Price summary uses the same rules as the price check.
  let unpriced = 0, noMargin = 0, lowRest = 0;
  try {
    const { getPriceCheckData } = await import("./price-check.server");
    const pc = await getPriceCheckData();
    unpriced = pc.lists.noCost.length; noMargin = pc.lists.noMargin.length; lowRest = pc.lists.lowRest.length;
  } catch { /* summary unavailable */ }
  const { loadEmailSettings } = await import("./email.server");
  const mail = await loadEmailSettings();
  // Test purchase: newest live (non-sandbox, Stripe live) order.
  const { data: o } = await a.from("orders").select("id,status,email_status,refunded_at,cost_amount,plan_id,stripe_payment_intent_id").eq("is_sandbox", false).eq("stripe_env", "live").order("created_at", { ascending: false }).limit(1).maybeSingle();
  let purchase = { orderId: null as string | null, paid: false, issuedWebhook: false, installData: false, emailSent: false, costMatches: null as boolean | null, refunded: false };
  if (o) {
    const [{ data: e }, { count: issued }, { data: plan }] = await Promise.all([
      a.from("esims").select("lpa_string").eq("order_id", o.id).maybeSingle(),
      a.from("provider_webhook_events").select("id", { count: "exact", head: true }).eq("order_id", o.id).eq("event_type", "order.issued").eq("status", "processed"),
      o.plan_id ? a.from("plans").select("cost_price").eq("id", o.plan_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    purchase = {
      orderId: o.id, paid: Boolean(o.stripe_payment_intent_id) && o.status !== "pending", issuedWebhook: (issued ?? 0) > 0, installData: Boolean(e?.lpa_string),
      emailSent: o.email_status === "sent", costMatches: o.cost_amount != null && plan?.cost_price != null ? Math.abs(Number(o.cost_amount) - Number(plan.cost_price)) < 0.005 : null,
      refunded: o.status === "refunded" || Boolean(o.refunded_at),
    };
  }
  const { buildChecklist } = await import("./admin.functions");
  const { shopChecklistMissing } = await import("./admin-rules");
  const c = await buildChecklist();
  const { data: shop } = await a.from("app_settings").select("value").eq("key", "shop_enabled").maybeSingle();
  const { data: ar } = await a.from("app_settings").select("value").eq("key", "auto_refund_enabled").maybeSingle();
  return {
    key: { set: s.apiKeySet, sandbox: s.sandbox, pingOk, pingMessage },
    webhook: { liveSecretSet: s.webhookSecretLiveSet, liveValidEvents: liveValid ?? 0, recent401: r401 ?? 0, sandboxEndpointRemovedConfirmed: Boolean(state.confirmations["sandbox_endpoint_removed"]) },
    catalog: { lastSyncOk: lastRun?.status === "ok" || lastRun?.status === "ok_with_warnings", lastSyncAt: lastRun?.finished_at ?? null, activePlans: activePlans ?? 0, countries: new Set((dests ?? []).map((d) => d.destination_id)).size, unpriced, noMargin, lowRest },
    stripe: { liveKey: Boolean(process.env["STRIPE_LIVE_API_KEY"]), liveSecret: Boolean(process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"]), liveEvents: stripeLive ?? 0, dashboardConfirmed: Boolean(state.confirmations["stripe_dashboard"]) },
    email: { authTemplates: true, testOk: mail.test_result?.ok === true, replyConfirmed: Boolean(mail.reply_confirmed_at) },
    purchase,
    autoRefund: { decided: Boolean(state.autoRefundDecision), enabled: ar?.value === true },
    shop: { missing: shopChecklistMissing(c), enabled: shop?.value === true },
  };
}

async function buildView() {
  const state = await loadState();
  const facts = await collectFacts(state);
  const { evaluateStep, STEP_COUNT, STEP_TITLES } = await import("./golive-wizard");
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => ({ n: i + 1, title: STEP_TITLES[i]!, result: evaluateStep(i + 1, facts), doneAt: state.done[String(i + 1)] ?? null }));
  const a = await db();
  let observe = null as null | { until: string; orders: number; errors: { action: string; at: string; message: string }[] };
  if (state.shopEnabledAt && Date.now() - Date.parse(state.shopEnabledAt) < 15 * 60_000) {
    const [{ count }, { data: errs }] = await Promise.all([
      a.from("orders").select("id", { count: "exact", head: true }).gte("created_at", state.shopEnabledAt).eq("is_sandbox", false),
      a.from("audit_log").select("action,created_at,meta").gte("created_at", state.shopEnabledAt).in("action", ["provider_order_failed", "provider_error", "payment_mismatch", "stripe_dispute", "plan_unavailable", "cost_mismatch", "auto_refund_failed"]).order("created_at", { ascending: false }).limit(20),
    ]);
    observe = { until: new Date(Date.parse(state.shopEnabledAt) + 15 * 60_000).toISOString(), orders: count ?? 0, errors: (errs ?? []).map((e) => ({ action: e.action, at: e.created_at, message: String((e.meta as { message?: string } | null)?.message ?? "") })) };
  }
  return { steps, facts: { catalog: facts.catalog, purchase: facts.purchase, shopMissing: facts.shop.missing, shopEnabled: facts.shop.enabled, autoRefund: facts.autoRefund }, confirmations: state.confirmations, observe };
}

export const getWizard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => { await assertAdmin(context as unknown as Ctx); return buildView(); });
export const wizardQuery = () => queryOptions({ queryKey: ["admin", "wizard"], queryFn: () => getWizard() });

export const checkWizardStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ step: z.number().int().min(1).max(9) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const state = await loadState();
    const { evaluateStep, tickStep } = await import("./golive-wizard");
    const r = evaluateStep(data.step, await collectFacts(state));
    await saveState({ ...state, done: tickStep(state.done, data.step, r, new Date()) });
    await audit(context.userId, "golive_check", { step: data.step, ok: r.ok, reason: r.reason ?? null });
    return r;
  });

export const confirmWizard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ key: z.enum(["sandbox_endpoint_removed", "stripe_dashboard"]), value: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const state = await loadState();
    const confirmations = { ...state.confirmations };
    if (data.value) confirmations[data.key] = new Date().toISOString(); else delete confirmations[data.key];
    await saveState({ ...state, confirmations });
    await audit(context.userId, "golive_confirm", { key: data.key, value: data.value });
    return { ok: true };
  });

export const decideAutoRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const a = await db();
    await a.from("app_settings").upsert({ key: "auto_refund_enabled", value: data.enabled, updated_at: new Date().toISOString() });
    const state = await loadState();
    await saveState({ ...state, autoRefundDecision: data.enabled ? "on" : "off" });
    await audit(context.userId, data.enabled ? "auto_refund_enabled" : "auto_refund_kept_off", { step: 8 });
    return { ok: true };
  });

export const runLiveSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { providerSetupStatus } = await import("./providers/index.server");
    if (providerSetupStatus().sandbox) return { status: "rejected", message: "Sandbox-Schlüssel: kein Live-Sync." };
    // Plans missing from the live catalog are deactivated by the sync (never deleted).
    const { runCatalogSync } = await import("./catalog-sync.server");
    const r = await runCatalogSync("manual");
    await audit(context.userId, "golive_live_sync", { step: 3, status: r.status });
    return { status: r.status, message: r.message ?? null, added: r.added, updated: r.updated, deactivated: r.deactivated };
  });

export const switchShopOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ confirmation: z.string().max(60) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { buildChecklist } = await import("./admin.functions");
    const { shopChecklistMissing } = await import("./admin-rules");
    const { canSwitchShopOn } = await import("./golive-wizard");
    const missing = shopChecklistMissing(await buildChecklist());
    if (!canSwitchShopOn(missing, data.confirmation)) return { ok: false as const, missing: missing.length ? missing : ["ausdrückliche Bestätigung"] };
    const a = await db();
    const now = new Date().toISOString();
    await a.from("app_settings").upsert({ key: "shop_enabled", value: true, updated_at: now });
    const state = await loadState();
    await saveState({ ...state, shopEnabledAt: now, done: { ...state.done, "9": now } });
    await audit(context.userId, "shop_enabled", { step: 9, via: "golive_wizard" });
    return { ok: true as const, missing: [] as string[] };
  });
