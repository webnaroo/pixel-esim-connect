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
    .select("id,provider_plan_id,type,data_mb,validity_days,cost_price,cost_currency,is_active,destination:destinations(slug,name_de,flag_code,type)")
    .eq("id", planId)
    .maybeSingle();
  if (!plan || !plan.is_active || !plan.destination) return null;
  const [{ data: rules }, { data: fxRows }, { data: vatRow }] = await Promise.all([
    db.from("pricing_rules").select("id,scope,scope_ref,type,value,rounding,priority"),
    db.from("fx_rates").select("from_currency,to_currency,rate,valid_from").lte("valid_from", new Date().toISOString()).order("valid_from", { ascending: false }),
    db.from("app_settings").select("value").eq("key", "vat_rate").maybeSingle(),
  ]);
  const vatRate = typeof vatRow?.value === "number" ? vatRow.value : 0.19;
  const fx = (from: string, to: string) => {
    const r = (fxRows ?? []).find((x) => x.from_currency.toUpperCase() === from && x.to_currency.toUpperCase() === to);
    return r ? Number(r.rate) : null;
  };
  // Recalculated on the server from cost + current rules; the stored list price is not trusted.
  const price = computePrice(
    { providerPlanId: plan.provider_plan_id, destinationSlug: plan.destination.slug, planType: plan.type, costPrice: Number(plan.cost_price), costCurrency: plan.cost_currency },
    (rules ?? []) as PricingRule[], fx, vatRate,
  );
  return { plan, price, vatRate };
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

type CheckoutResult = { ok: true; orderId: string; clientSecret: string; token: string; isTest: boolean } | { ok: false; error: CheckoutError };

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

    const r = await loadPricedPlan(parsed.data.planId);
    if (!r) return { ok: false, error: "plan_unavailable" };
    if (!r.price.ok) return { ok: false, error: "price_unavailable" };

    const { paymentsConfigured, createPayment } = await import("./payments.server");
    if (!paymentsConfigured()) return { ok: false, error: "payment_unavailable" };

    const { data: order, error } = await db
      .from("orders")
      .insert({
        user_id: caller.userId,
        guest_email: parsed.data.email,
        plan_id: r.plan.id,
        plan_snapshot: { provider_plan_id: r.plan.provider_plan_id, type: r.plan.type, data_mb: r.plan.data_mb, validity_days: r.plan.validity_days, destination: r.plan.destination!.name_de },
        amount: r.price.gross,
        net: r.price.net,
        tax: r.price.vat,
        currency: r.price.currency,
        status: "pending",
        withdrawal_consent_at: new Date().toISOString(),
        is_test: !live,
      })
      .select("id")
      .single();
    if (error || !order) return { ok: false, error: "payment_unavailable" };

    const pay = await createPayment({ orderId: order.id, amountCents: Math.round(r.price.gross * 100), currency: r.price.currency, email: parsed.data.email });
    await db.from("orders").update({ stripe_payment_intent_id: pay.paymentIntentId }).eq("id", order.id);
    const { signGuestToken } = await import("./guest-token");
    return { ok: true, orderId: order.id, clientSecret: pay.clientSecret, token: await signGuestToken(order.id, process.env["GUEST_TOKEN_SECRET"]!), isTest: !live };
  });
