import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { checkoutRequestSchema, type CheckoutError } from "./checkout-rules";
import { computePrice, type PricingRule } from "./pricing";

async function loadPricedPlan(planId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: plan } = await db
    .from("plans")
    .select("id,provider_plan_id,type,data_mb,validity_days,cost_price,cost_currency,is_active,throttle_claim,destination:destinations(slug,name_de,flag_code,type)")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || !plan.is_active || !plan.destination) return null;
  const [{ data: rules }, fxCtx, { data: vatRow }] = await Promise.all([
    db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
    import("./fx.server").then(({ loadFx }) => loadFx(db)),
    db.from("app_settings").select("value").eq("key", "vat_rate").maybeSingle(),
  ]);
  const vatRate = typeof vatRow?.value === "number" ? vatRow.value : 0.19;
  const fx = fxCtx.lookup;
  const fxRate = plan.cost_currency.toUpperCase() === "EUR" ? 1 : fx(plan.cost_currency, "EUR");
  // Recalculated on the server from cost + current rules; the stored list price is not trusted.
  const price = computePrice(
    { providerPlanId: plan.provider_plan_id, destinationSlug: plan.destination.slug, planType: plan.type, costPrice: Number(plan.cost_price), costCurrency: plan.cost_currency },
    (rules ?? []) as PricingRule[], fx, vatRate,
  );
  return { plan, price, vatRate, fxRate };
}

export const getCheckoutPlan = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ planId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const r = await loadPricedPlan(data.planId);
    if (!r) return null;
    const d = r.plan.destination!;
    return {
      id: r.plan.id,
      type: r.plan.type,
      dataMb: r.plan.data_mb,
      validityDays: r.plan.validity_days,
      throttleClaim: r.plan.throttle_claim as "unknown" | "none_confirmed" | "conflict",
      destination: { slug: d.slug, name: d.name_de, flagCode: d.flag_code, type: d.type },
      price: r.price.ok ? { gross: r.price.gross, net: r.price.net, vat: r.price.vat, currency: r.price.currency, vatRate: r.vatRate } : null,
    };
  });

export const checkoutPlanQuery = (planId: string) =>
  queryOptions({ queryKey: ["checkout-plan", planId], queryFn: () => getCheckoutPlan({ data: { planId } }) });

async function callerIdentity(): Promise<{ userId: string | null; isAdmin: boolean }> {
  const auth = getRequestHeader("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { userId: null, isAdmin: false };
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const userDb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: auth, apikey: key } },
  });
  const { data: u } = await userDb.auth.getUser(auth.slice(7));
  if (!u.user) return { userId: null, isAdmin: false };
  const { data: isAdmin } = await userDb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  return { userId: u.user.id, isAdmin: Boolean(isAdmin) };
}

type CheckoutResult = { ok: true; orderId: string; clientSecret: string; token: string; isTest: boolean } | { ok: false; error: CheckoutError; detail?: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i)
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: allowed } = await db.rpc("rate_limit_hit", { _bucket: `checkout:${ip}`, _window_seconds: 60, _max: 10 });
    if (!allowed) return { ok: false, error: "rate_limited" };

    const parsed = checkoutRequestSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "invalid_request" };

    const { providerSetupStatus } = await import("./providers/index.server");
    if (!providerSetupStatus().configured) return { ok: false, error: "shop_unavailable" };

    const caller = await callerIdentity();
    const { data: shop } = await db.from("app_settings").select("value").eq("key", "shop_enabled").maybeSingle();
    const live = shop?.value === true;
    // While the shop switch is off, only admins may place (test) orders.
    if (!live && !caller.isAdmin) return { ok: false, error: "shop_unavailable" };
    const { data: paused } = await db.from("app_settings").select("value").eq("key", "sales_paused").maybeSingle();
    if (paused?.value === true) return { ok: false, error: "shop_unavailable" }; // sales pause applies to everyone

    const r = await loadPricedPlan(parsed.data.planId);
    if (!r) return { ok: false, error: "plan_unavailable" };
    if (!r.price.ok) return { ok: false, error: "price_unavailable" };

    const { paymentsConfigured, createPayment } = await import("./payments.server");
    const env = parsed.data.environment;
    if (!paymentsConfigured(env)) return { ok: false, error: "payment_unavailable" };
    // Live payments only once the shop is live; test payments only for admin test orders.
    if ((env === "live") !== live) return { ok: false, error: "shop_unavailable" };

    const { data: order, error } = await db
      .from("orders")
      .insert({
        user_id: caller.userId,
        guest_email: parsed.data.email,
        plan_id: r.plan.id,
        plan_snapshot: { provider_plan_id: r.plan.provider_plan_id, type: r.plan.type, data_mb: r.plan.data_mb, validity_days: r.plan.validity_days, destination: r.plan.destination!.name_de, throttle_claim: r.plan.throttle_claim },
        amount: r.price.gross,
        net: r.price.net,
        tax: r.price.vat,
        currency: r.price.currency,
        status: "pending",
        withdrawal_consent_at: new Date().toISOString(),
        is_test: !live,
        is_sandbox: (await import("./providers/index.server")).providerSetupStatus().sandbox,
        stripe_env: env,
        // Margin traceability + price frozen for 30 minutes from checkout start.
        fx_rate: r.fxRate,
        cost_amount: Number(r.plan.cost_price),
        cost_currency: r.plan.cost_currency,
        price_frozen_until: new Date(Date.now() + 30 * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error || !order) return { ok: false, error: "payment_unavailable" };

    const { signGuestToken } = await import("./guest-token");
    const token = await signGuestToken(order.id, process.env["GUEST_TOKEN_SECRET"]!);
    const dest = r.plan.destination!.name_de;
    const description = `GlobeSIM eSIM ${dest} · ${r.plan.type === "unlimited" ? "Unlimited" : `${Math.round((r.plan.data_mb ?? 0) / 102.4) / 10} GB`} · ${r.plan.validity_days} Tage`;
    try {
      const pay = await createPayment({
        env, orderId: order.id, amountCents: Math.round(r.price.gross * 100), currency: r.price.currency, email: parsed.data.email, userId: caller.userId, description,
        // The redirect only shows the order page; it never marks the order paid (only the verified webhook does).
        returnUrl: `${parsed.data.returnOrigin}/order/${order.id}?t=${encodeURIComponent(token)}`,
      });
      await db.from("orders").update({ stripe_session_id: pay.sessionId }).eq("id", order.id);
      return { ok: true, orderId: order.id, clientSecret: pay.clientSecret, token, isTest: !live };
    } catch (e) {
      const { getStripeErrorMessage } = await import("./stripe.server");
      await db.from("orders").update({ status: "cancelled", last_error: getStripeErrorMessage(e).slice(0, 300) }).eq("id", order.id);
      return { ok: false, error: "payment_unavailable", detail: getStripeErrorMessage(e) };
    }
  });
