// Customer emails are only sent from a verified sender domain. Otherwise the order shows "E-Mail ausstehend".
export type EmailSettings = {
  sender_domain: string; verified: boolean;
  /** Local part of the From address, e.g. "bestellung" → bestellung@<sender_domain>. */
  from_local: string;
  reply_to: string;
  test_sent_at: string | null;
  test_result: { ok: boolean; reason?: string; at: string } | null;
  reply_confirmed_at: string | null;
};
export type EmailKind = "confirmation" | "install_link" | "failure" | "usage_alert" | "refund";

export const DEFAULT_FROM_LOCAL = "bestellung";
export const DEFAULT_REPLY_TO = "support@globesim.de";

export function parseEmailSettings(v: unknown): EmailSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
  const tr = o["test_result"] as EmailSettings["test_result"] | undefined;
  return {
    sender_domain: s("sender_domain").toLowerCase(),
    verified: o["verified"] === true,
    from_local: /^[a-z0-9._-]{1,40}$/.test(s("from_local").toLowerCase()) ? s("from_local").toLowerCase() : DEFAULT_FROM_LOCAL,
    reply_to: isValidEmail(s("reply_to")) ? s("reply_to").toLowerCase() : DEFAULT_REPLY_TO,
    test_sent_at: s("test_sent_at") || null,
    test_result: tr && typeof tr === "object" && typeof tr.ok === "boolean" ? tr : null,
    reply_confirmed_at: s("reply_confirmed_at") || null,
  };
}

export const isValidDomain = (d: string) => /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(d);
export const isValidEmail = (e: string) => /^[^\s@]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(e);

export function canSendCustomerEmail(s: EmailSettings): boolean {
  return s.verified && isValidDomain(s.sender_domain);
}

export function emailStatusWhenUnsendable(s: EmailSettings): "pending_domain" | null {
  return canSendCustomerEmail(s) ? null : "pending_domain";
}

/** Which template a customer email kind uses. */
export const TEMPLATE_FOR_KIND: Record<EmailKind, string> = {
  confirmation: "order-ready",
  install_link: "order-ready",
  failure: "order-problem",
  usage_alert: "usage-alert",
  refund: "refund-notice",
};
