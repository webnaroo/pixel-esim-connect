// Server-only: sends one email through the Resend HTTP API (RESEND_API_KEY). Never import from client components.
// No SDK: plain fetch works on Cloudflare Workers. Error bodies are never stored or logged, only status and code.

export class EmailSendError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(`Email send failed: ${status} ${code}`);
    this.name = "EmailSendError";
  }
  get retryable() { return this.status === 429 || (this.status >= 500 && this.status < 600); }
}

export type ResendMessage = {
  from: { name: string; address: string };
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Resend dedupes the same key for 24 h, so retries of one logical send never deliver twice. */
  idempotencyKey: string;
};

/** "Name <a@b.de>" with the display name quoted so punctuation cannot break the header. */
export function formatFrom(from: { name: string; address: string }): string {
  const hasForbidden = [...from.name + from.address].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === "<" || c === ">");
  if (hasForbidden) throw new Error("from must not contain control characters or angle brackets");
  const name = from.name.trim();
  return name ? `"${name.replace(/[\\"]/g, "\\$&")}" <${from.address.trim()}>` : from.address.trim();
}

export async function sendResendEmail(msg: ResendMessage): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new EmailSendError(503, "resend_not_configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": msg.idempotencyKey.slice(0, 256) },
    body: JSON.stringify({
      from: formatFrom(msg.from),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  });
  if (res.ok) return;
  let code = "send_failed";
  try {
    const body = (await res.json()) as { name?: unknown };
    if (typeof body.name === "string" && /^[a-z_]{1,60}$/.test(body.name)) code = body.name;
  } catch { /* keep generic code */ }
  throw new EmailSendError(res.status, code);
}
