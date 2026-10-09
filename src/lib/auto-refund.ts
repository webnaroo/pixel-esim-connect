// Automatic refund on a clear eSIMerge failure. Pure core; I/O is injected so the safety rules are testable.

/** Wait after the failure so a retry of a temporary error can still deliver. */
export const AUTO_REFUND_DELAY_MS = 30 * 60_000;

export type RefundCandidate = {
  id: string;
  status: string;
  failedAt: string | null;
  paymentIntentId: string | null;
  refundStartedAt: string | null;
  /** Installation data (LPA / activation code / install URL) was ever stored for this order. */
  installDataIssued: boolean;
};

export type RefundDecision = { refund: true } | { refund: false; reason: "disabled" | "not_failed" | "no_payment" | "install_data_issued" | "already_refunding" | "too_early" };

/** Only fulfillment_failed (clear failure) — never needs_review / unclear outcomes, never once install data went out. */
export function autoRefundDecision(o: RefundCandidate, now: Date, enabled: boolean): RefundDecision {
  if (!enabled) return { refund: false, reason: "disabled" };
  if (o.status !== "fulfillment_failed" || !o.failedAt) return { refund: false, reason: "not_failed" };
  if (o.installDataIssued) return { refund: false, reason: "install_data_issued" };
  if (!o.paymentIntentId) return { refund: false, reason: "no_payment" };
  if (o.refundStartedAt) return { refund: false, reason: "already_refunding" };
  if (now.getTime() - new Date(o.failedAt).getTime() < AUTO_REFUND_DELAY_MS) return { refund: false, reason: "too_early" };
  return { refund: true };
}

/** One Stripe idempotency key per order: manual and automatic refunds can never refund twice. */
export const refundIdempotencyKey = (orderId: string) => `refund-${orderId}`;

export type AutoRefundDeps = {
  enabled(): Promise<boolean>;
  candidates(): Promise<RefundCandidate[]>;
  /** Atomically sets refund_started_at when still null and status still fulfillment_failed; false if someone else got it. */
  claim(orderId: string): Promise<boolean>;
  release(orderId: string, error: string): Promise<void>;
  refund(orderId: string, paymentIntentId: string, idempotencyKey: string): Promise<{ refundId: string }>;
  markRefunded(orderId: string, refundId: string): Promise<void>;
  notify(orderId: string, refundId: string): Promise<void>;
  now(): Date;
};

export async function runAutoRefunds(d: AutoRefundDeps): Promise<{ refunded: string[]; skipped: number; errors: number }> {
  const out = { refunded: [] as string[], skipped: 0, errors: 0 };
  const enabled = await d.enabled();
  if (!enabled) return out;
  for (const o of await d.candidates()) {
    if (!autoRefundDecision(o, d.now(), enabled).refund) { out.skipped++; continue; }
    if (!(await d.claim(o.id))) { out.skipped++; continue; }
    try {
      const r = await d.refund(o.id, o.paymentIntentId!, refundIdempotencyKey(o.id));
      await d.markRefunded(o.id, r.refundId);
      await d.notify(o.id, r.refundId);
      out.refunded.push(o.id);
    } catch (e) {
      out.errors++;
      await d.release(o.id, e instanceof Error ? e.message.slice(0, 200) : "refund_failed");
    }
  }
  return out;
}
