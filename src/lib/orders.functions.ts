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
  plan: { destination?: string; type?: string; data_mb?: number | null; validity_days?: number };
  esim: { status: string; iccid: string | null; lpa: string | null; smdp: string | null; activationCode: string | null; directInstallUrl: string | null } | null;
};

/** Guest access: the signed, expiring token is the authorisation. Activation data only for a valid token. */
export const getOrderView = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ orderId: z.string().uuid(), token: z.string().min(10).max(200) }).parse(i))
  .handler(async ({ data }): Promise<OrderView | null> => {
    const secret = process.env["GUEST_TOKEN_SECRET"];
    if (!secret) return null;
    const { verifyGuestToken } = await import("./guest-token");
    if (!(await verifyGuestToken(data.token, data.orderId, secret))) return null;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: o } = await db.from("orders").select("id,status,guest_email,amount,currency,created_at,is_test,plan_snapshot").eq("id", data.orderId).maybeSingle();
    if (!o) return null;
    const { data: e } = await db.from("esims").select("status,iccid,lpa_string,smdp_address,activation_code,direct_install_url").eq("order_id", o.id).maybeSingle();
    return {
      id: o.id,
      status: o.status,
      email: o.guest_email,
      amount: Number(o.amount),
      currency: o.currency,
      createdAt: o.created_at,
      isTest: o.is_test,
      plan: (o.plan_snapshot ?? {}) as OrderView["plan"],
      esim: e && o.status === "fulfilled"
        ? { status: e.status, iccid: e.iccid, lpa: e.lpa_string, smdp: e.smdp_address, activationCode: e.activation_code, directInstallUrl: e.direct_install_url }
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
      .select("id,status,guest_email,amount,currency,fulfillment_attempts,last_error,is_test,created_at,plan_snapshot")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminOrdersQuery = () => queryOptions({ queryKey: ["admin", "orders"], queryFn: () => listAdminOrders() });

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: o } = await db.from("orders").select("status,stripe_payment_intent_id,stripe_env").eq("id", data.orderId).single();
    if (!o || !["paid", "fulfilling", "fulfillment_failed", "payment_mismatch", "needs_review"].includes(o.status)) throw new Error("Nur bezahlte, nicht ausgelieferte Bestellungen können hier erstattet werden.");
    if (!o.stripe_payment_intent_id) throw new Error("Keine Zahlung zu dieser Bestellung gefunden.");
    const { refundPayment } = await import("./payments.server");
    const r = await refundPayment(o.stripe_env === "live" ? "live" : "sandbox", o.stripe_payment_intent_id);
    await db.from("orders").update({ status: "refunded" }).eq("id", data.orderId);
    await db.from("audit_log").insert({ actor_id: context.userId, action: "order_refunded", entity: "order", entity_id: data.orderId, meta: { refund_id: r.refundId } });
    return { ok: true };
  });
