// Order emails (confirmation, installation link, failure).
// Rule: nothing goes to customers until the sender domain is verified (src/lib/email-rules.ts).
// Until then the order is marked email_status = 'pending_domain' and the admin sees a notice.
// TODO(EMAIL): wire the real send once the sender domain is set up; plan line must use unlimitedLabelText() from ./throttle.
// Must never include activation code / LPA in logs; the email links to the signed installation page only.
import { canSendCustomerEmail, parseEmailSettings, type EmailKind } from "./email-rules";

export async function sendOrderEmail(orderId: string, _kind: EmailKind): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data } = await db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle();
  const settings = parseEmailSettings(data?.value);
  if (!canSendCustomerEmail(settings)) {
    await db.from("orders").update({ email_status: "pending_domain" }).eq("id", orderId);
    return { sent: false, reason: "sender_domain_not_verified" };
  }
  await db.from("orders").update({ email_status: "pending_domain" }).eq("id", orderId);
  return { sent: false, reason: "email_not_configured" };
}

export const sendOrderReadyEmail = (orderId: string) => sendOrderEmail(orderId, "install_link");
