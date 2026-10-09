// Customer emails are only sent from a verified sender domain. Otherwise the order shows "E-Mail ausstehend".
export type EmailSettings = { sender_domain: string; verified: boolean };
export type EmailKind = "confirmation" | "install_link" | "failure" | "usage_alert";

export function parseEmailSettings(v: unknown): EmailSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { sender_domain: typeof o["sender_domain"] === "string" ? o["sender_domain"].trim().toLowerCase() : "", verified: o["verified"] === true };
}

export const isValidDomain = (d: string) => /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(d);

export function canSendCustomerEmail(s: EmailSettings): boolean {
  return s.verified && isValidDomain(s.sender_domain);
}

export function emailStatusWhenUnsendable(s: EmailSettings): "pending_domain" | null {
  return canSendCustomerEmail(s) ? null : "pending_domain";
}
