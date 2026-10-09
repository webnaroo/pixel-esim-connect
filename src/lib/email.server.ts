// Customer emails (installation link, problem, usage hint, refund). Single gateway for all customer mail.
// Rule: nothing goes to customers until the sender domain is verified (src/lib/email-rules.ts);
// until then the order is marked email_status = 'pending_domain'.
// Never includes activation code / LPA / QR — only the signed installation or order link.
import { canSendCustomerEmail, parseEmailSettings, TEMPLATE_FOR_KIND, type EmailKind } from "./email-rules";

export async function loadEmailSettings() {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data } = await db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle();
  return parseEmailSettings(data?.value);
}

export async function sendOrderEmail(orderId: string, kind: EmailKind, extra: { threshold?: number } = {}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const settings = await loadEmailSettings();
  if (!canSendCustomerEmail(settings)) {
    await db.from("orders").update({ email_status: "pending_domain" }).eq("id", orderId);
    return { sent: false, reason: "sender_domain_not_verified" };
  }
  const { data: order } = await db.from("orders").select("id,guest_email,plan_snapshot,user_id,amount,currency,discount_code,discount_amount").eq("id", orderId).maybeSingle();
  if (!order?.guest_email) return { sent: false, reason: "no_recipient" };
  const secret = process.env["GUEST_TOKEN_SECRET"];
  if (!secret) return { sent: false, reason: "token_secret_missing" };
  const { signGuestToken } = await import("./guest-token");
  const { SITE_URL } = await import("./seo");
  const token = encodeURIComponent(await signGuestToken(orderId, secret));
  const snap = (order.plan_snapshot ?? {}) as { destination?: string; type?: string; data_mb?: number | null; validity_days?: number; throttle_claim?: string };
  const { formatData, formatPrice } = await import("./format");
  const { unlimitedLabelText } = await import("./throttle");
  const { data: claimTexts } = await db.from("app_settings").select("value").eq("key", "unlimited_claim").maybeSingle();
  const volume = snap.type === "unlimited" ? unlimitedLabelText(snap.throttle_claim as never, (claimTexts?.value ?? null) as never).split("\n")[0] : formatData(snap.data_mb ?? null);
  const plan = [snap.destination, volume, snap.validity_days ? `${snap.validity_days} Tage` : null].filter(Boolean).join(" · ");
  const templateData = {
    orderId,
    plan,
    installUrl: `${SITE_URL}/install/${orderId}?t=${token}`,
    orderUrl: `${SITE_URL}/order/${orderId}?t=${token}`,
    threshold: extra.threshold,
    total: formatPrice(Number(order.amount), order.currency),
    discount: Number(order.discount_amount) > 0 ? `${order.discount_code ?? "Rabatt"}: −${formatPrice(Number(order.discount_amount), order.currency)}` : undefined,
  };
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  try {
    const r = await sendTemplateEmail(TEMPLATE_FOR_KIND[kind], order.guest_email, {
      templateData,
      fromLocal: settings.from_local,
      replyTo: settings.reply_to,
      // One logical mail per order and kind (usage per threshold): retries never send twice.
      idempotencyKey: `${kind}-${orderId}${extra.threshold ? `-${extra.threshold}` : ""}`,
    });
    if (kind === "install_link" || kind === "confirmation") await db.from("orders").update({ email_status: r.sent ? "sent" : "failed" }).eq("id", orderId);
    return r.sent ? { sent: true } : { sent: false, reason: r.reason };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "send_failed";
    console.error("order_email_failed", orderId, kind, code);
    if (kind === "install_link" || kind === "confirmation") await db.from("orders").update({ email_status: "failed" }).eq("id", orderId);
    return { sent: false, reason: code };
  }
}

export const sendOrderReadyEmail = (orderId: string) => sendOrderEmail(orderId, "install_link");

// Admin notice for every paid order. Best effort: the order flow never fails because of this mail.
// One mail per admin per order (idempotency key), no activation data included.
export async function notifyAdminsNewOrder(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const settings = await loadEmailSettings();
    if (!canSendCustomerEmail(settings)) return;
    const { data: order } = await db.from("orders").select("id,guest_email,plan_snapshot,amount,currency").eq("id", orderId).maybeSingle();
    if (!order) return;
    const snap = (order.plan_snapshot ?? {}) as { destination?: string; type?: string; data_mb?: number | null; validity_days?: number };
    const { formatData, formatPrice } = await import("./format");
    const plan = [snap.destination, snap.type === "unlimited" ? "Unlimited" : formatData(snap.data_mb ?? null), snap.validity_days ? `${snap.validity_days} Tage` : null].filter(Boolean).join(" · ");
    const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "admin");
    const { data: admins } = await db.from("profiles").select("email").in("id", (roles ?? []).map((r) => r.user_id));
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { SITE_URL } = await import("./seo");
    for (const a of admins ?? []) {
      if (!a.email) continue;
      await sendTemplateEmail("admin-new-order", a.email, {
        templateData: {
          orderId: order.id.slice(0, 8),
          plan,
          total: formatPrice(Number(order.amount), order.currency),
          customer: order.guest_email ?? undefined,
          url: `${SITE_URL}/admin/orders`,
        },
        fromLocal: settings.from_local,
        replyTo: settings.reply_to,
        idempotencyKey: `admin-new-order-${orderId}-${a.email}`,
      }).catch(() => undefined);
    }
  } catch {
    console.error("admin_new_order_mail_failed", orderId);
  }
}
