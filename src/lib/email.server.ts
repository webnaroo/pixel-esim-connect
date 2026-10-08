// Order emails. TODO(EMAIL): wire up once a sender domain is set up for GlobeSIM.
// Plan line must use unlimitedLabelText() from ./throttle so the "ohne Drosselung" rule is identical to the UI.
// Must never include activation code / LPA in logs; the email itself links to the signed installation page.
export async function sendOrderReadyEmail(_orderId: string): Promise<{ sent: boolean; reason?: string }> {
  return { sent: false, reason: "email_not_configured" };
}
