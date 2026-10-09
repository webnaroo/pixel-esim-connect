import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderView = {
  id: string;
  status: string;
  email: string;
  amount: number;
  currency: string;
  createdAt: string;
  isTest: boolean;
  emailStatus: string;
  discountCode: string | null;
  discountAmount: number;
  plan: { destination?: string; type?: string; data_mb?: number | null; validity_days?: number; throttle_claim?: "unknown" | "none_confirmed" | "conflict" };
  esim: { status: string; iccid: string | null; lpa: string | null; smdp: string | null; activationCode: string | null; directInstallUrl: string | null; iosUrl: string | null; androidUrl: string | null; installUntil: string | null; activatedAt: string | null } | null;
};

/** Guest access: the signed, expiring token is the authorisation. Activation data only for a valid token. */
// POST so the token never lands in a URL (server logs, proxies, referrers).
export const getOrderView = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ orderId: z.string().uuid(), token: z.string().min(10).max(200) }).parse(i))
  .handler(async ({ data }): Promise<OrderView | null> => {
    const secret = process.env["GUEST_TOKEN_SECRET"];
    if (!secret) return null;
    const { verifyGuestToken } = await import("./guest-token");
    if (!(await verifyGuestToken(data.token, data.orderId, secret))) return null;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: o } = await db.from("orders").select("id,status,guest_email,amount,currency,created_at,is_test,plan_snapshot,email_status,discount_code,discount_amount").eq("id", data.orderId).maybeSingle();
    if (!o) return null;
    // Link dies with a refund or cancellation (in addition to the 30-day token expiry).
    if (o.status === "refunded" || o.status === "cancelled") return null;
    const { data: e } = await db.from("esims").select("status,iccid,lpa_string,smdp_address,activation_code,direct_install_url,ios_install_url,android_install_url,expires_at,activated_at").eq("order_id", o.id).maybeSingle();
    return {
      id: o.id,
      status: o.status,
      email: o.guest_email,
      amount: Number(o.amount),
      currency: o.currency,
      createdAt: o.created_at,
      isTest: o.is_test,
      emailStatus: o.email_status,
      discountCode: o.discount_code,
      discountAmount: Number(o.discount_amount ?? 0),
      plan: (o.plan_snapshot ?? {}) as OrderView["plan"],
      esim: e && o.status === "fulfilled"
        ? { status: e.status, iccid: e.iccid, lpa: e.lpa_string, smdp: e.smdp_address, activationCode: e.activation_code, directInstallUrl: e.direct_install_url, iosUrl: e.ios_install_url, androidUrl: e.android_install_url, installUntil: e.expires_at, activatedAt: e.activated_at }
        : null,
    };
  });

export const orderViewQuery = (orderId: string, token: string) =>
  queryOptions({ queryKey: ["order", orderId], queryFn: () => getOrderView({ data: { orderId, token } }), refetchInterval: (q) => (q.state.data?.status === "fulfilled" ? false : 5000) });

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data } = await db
      .from("orders")
      .select("id,status,guest_email,amount,currency,fulfillment_attempts,last_error,is_test,is_sandbox,created_at,plan_snapshot,email_status,dispute_status,discount_code,discount_amount")
      .order("created_at", { ascending: false })
      .limit(500);
    const ids = (data ?? []).map((o) => o.id);
    const { data: es } = ids.length ? await db.from("esims").select("order_id,provider_order_id").in("order_id", ids) : { data: [] };
    const prov = new Map((es ?? []).map((e) => [e.order_id, e.provider_order_id]));
    const withProv = (data ?? []).map((o) => ({ ...o, provider_order_id: prov.get(o.id) ?? null }));
    return withProv;
  });

export const adminOrdersQuery = () => queryOptions({ queryKey: ["admin", "orders"], queryFn: () => listAdminOrders() });

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: o } = await db.from("orders").select("status,stripe_payment_intent_id,stripe_env").eq("id", data.orderId).single();
    if (!o || !["paid", "fulfilling", "fulfilled", "fulfillment_failed", "payment_mismatch", "needs_review"].includes(o.status)) throw new Error("Nur bezahlte Bestellungen können erstattet werden.");
    if (!o.stripe_payment_intent_id) throw new Error("Keine Zahlung zu dieser Bestellung gefunden.");
    const { refundPayment } = await import("./payments.server");
    const { refundIdempotencyKey } = await import("./auto-refund");
    // Same key as the automatic refund: a manual and an automatic refund can never both go through.
    const r = await refundPayment(o.stripe_env === "live" ? "live" : "sandbox", o.stripe_payment_intent_id, refundIdempotencyKey(data.orderId));
    await db.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: r.refundId, refund_started_at: new Date().toISOString() }).eq("id", data.orderId);
    await db.from("audit_log").insert({ actor_id: context.userId, action: "order_refunded", entity: "order", entity_id: data.orderId, meta: { refund_id: r.refundId } });
    return { ok: true };
  });
