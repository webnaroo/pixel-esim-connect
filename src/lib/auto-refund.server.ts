// DB + Stripe bindings for automatic refunds. Runs from the 5-minute status poll.
import { AUTO_REFUND_DELAY_MS, runAutoRefunds, type AutoRefundDeps } from "./auto-refund";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const dbAutoRefundDeps: AutoRefundDeps = {
  async enabled() {
    const db = await admin();
    const { data } = await db.from("app_settings").select("value").eq("key", "auto_refund_enabled").maybeSingle();
    return data?.value === true;
  },
  async candidates() {
    const db = await admin();
    const { data } = await db
      .from("orders")
      .select("id,status,failed_at,stripe_payment_intent_id,refund_started_at,esims(lpa_string,activation_code,ios_install_url,android_install_url,direct_install_url)")
      .eq("status", "fulfillment_failed")
      .is("refund_started_at", null)
      .not("failed_at", "is", null)
      .lte("failed_at", new Date(Date.now() - AUTO_REFUND_DELAY_MS).toISOString())
      .limit(20);
    return (data ?? []).map((o) => {
      const es = (Array.isArray(o.esims) ? o.esims : o.esims ? [o.esims] : []) as { lpa_string: string | null; activation_code: string | null; ios_install_url: string | null; android_install_url: string | null; direct_install_url: string | null }[];
      return {
        id: o.id, status: o.status, failedAt: o.failed_at, paymentIntentId: o.stripe_payment_intent_id, refundStartedAt: o.refund_started_at,
        installDataIssued: es.some((e) => e.lpa_string || e.activation_code || e.ios_install_url || e.android_install_url || e.direct_install_url),
      };
    });
  },
  async claim(orderId) {
    const db = await admin();
    const { data } = await db.from("orders").update({ refund_started_at: new Date().toISOString() }).eq("id", orderId).eq("status", "fulfillment_failed").is("refund_started_at", null).select("id");
    return (data ?? []).length > 0;
  },
  async release(orderId, error) {
    const db = await admin();
    await db.from("orders").update({ refund_started_at: null }).eq("id", orderId).eq("status", "fulfillment_failed");
    await db.from("audit_log").insert({ action: "auto_refund_failed", entity: "order", entity_id: orderId, meta: { message: `Automatische Erstattung fehlgeschlagen – bitte manuell prüfen (${error})` } });
  },
  async refund(orderId, paymentIntentId, idempotencyKey) {
    const db = await admin();
    const { data } = await db.from("orders").select("stripe_env").eq("id", orderId).single();
    const { refundPayment } = await import("./payments.server");
    return refundPayment(data?.stripe_env === "live" ? "live" : "sandbox", paymentIntentId, idempotencyKey);
  },
  async markRefunded(orderId, refundId) {
    const db = await admin();
    await db.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: refundId, next_attempt_at: null }).eq("id", orderId);
    await db.from("audit_log").insert({ action: "auto_refunded", entity: "order", entity_id: orderId, meta: { refund_id: refundId, message: "Automatisch vollständig erstattet (eSIM konnte nicht bereitgestellt werden)" } });
  },
  async notify(orderId) {
    const { sendOrderEmail } = await import("./email.server");
    await sendOrderEmail(orderId, "refund");
  },
  now: () => new Date(),
};

export const runDbAutoRefunds = () => runAutoRefunds(dbAutoRefundDeps);
