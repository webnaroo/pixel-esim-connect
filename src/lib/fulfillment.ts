// Pure fulfillment core. I/O is injected so the "never deliver twice" rules are testable.
import { ProviderRequestError, type EsimDetails, type ProviderOrderResult } from "./providers/types";

/** First attempt plus 3 retries (after 1, 5 and 25 minutes). */
export const MAX_FULFILLMENT_ATTEMPTS = 4;

/** Growing delay after failed attempt n: 1 min, 5 min, 25 min. */
export function backoffSeconds(attempt: number): number {
  return 60 * 5 ** Math.max(0, attempt - 1);
}

export type ClaimedOrder = { id: string; attempts: number; idempotencyKey: string; providerPlanId: string; email: string };

export interface FulfillmentStore {
  /** Atomically claims a paid order, or a 'fulfilling' order whose retry is due. Null when held elsewhere or not due. */
  claim(orderId: string, maxAttempts: number): Promise<ClaimedOrder | null>;
  markFulfilled(orderId: string, providerOrderId: string, esim: EsimDetails | undefined): Promise<void>;
  /** Keeps status 'fulfilling' and sets the next attempt time. */
  scheduleRetry(orderId: string, at: Date, error: string): Promise<void>;
  markFailed(orderId: string, error: string): Promise<void>;
  /** Outcome of the provider call is unknown (timeout/network): stop, no automatic retry, admin must check. */
  markNeedsReview(orderId: string, error: string): Promise<void>;
}

/**
 * A clear rejection is an HTTP answer from the provider (4xx/5xx). Anything else
 * (timeout, network error) leaves it unknown whether the provider created the order.
 */
export function isClearRejection(e: unknown): boolean {
  return e instanceof ProviderRequestError && typeof e.status === "number";
}

export type FulfillDeps = {
  store: FulfillmentStore;
  createOrder: (input: { providerPlanId: string; customerEmail: string; idempotencyKey: string }) => Promise<ProviderOrderResult>;
  now?: () => Date;
};

export type FulfillOutcome = "skipped" | "fulfilled" | "retry_scheduled" | "failed" | "needs_review";

/** Error text safe to store: never contains activation data. */
export function safeError(e: unknown): string {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : "Unbekannter Fehler";
  return msg.replace(/LPA:1\$[^\s"']+/gi, "[masked]").slice(0, 300);
}

export async function fulfillOrder(deps: FulfillDeps, orderId: string): Promise<FulfillOutcome> {
  const claimed = await deps.store.claim(orderId, MAX_FULFILLMENT_ATTEMPTS);
  if (!claimed) return "skipped";
  try {
    const res = await deps.createOrder({
      providerPlanId: claimed.providerPlanId,
      customerEmail: claimed.email,
      // Same key on every retry, so the provider never creates a second eSIM.
      idempotencyKey: claimed.idempotencyKey,
    });
    await deps.store.markFulfilled(orderId, res.providerOrderId, res.esim);
    return "fulfilled";
  } catch (e) {
    const err = safeError(e);
    if (!isClearRejection(e)) {
      await deps.store.markNeedsReview(orderId, err);
      return "needs_review";
    }
    if (claimed.attempts >= MAX_FULFILLMENT_ATTEMPTS) {
      await deps.store.markFailed(orderId, err);
      return "failed";
    }
    const now = (deps.now ?? (() => new Date()))();
    await deps.store.scheduleRetry(orderId, new Date(now.getTime() + backoffSeconds(claimed.attempts) * 1000), err);
    return "retry_scheduled";
  }
}

export interface WebhookEventStore {
  /** Inserts (source, eventId); returns false when the event was already recorded. */
  record(source: string, eventId: string): Promise<boolean>;
}

/** Runs the handler only for the first delivery of an event id. */
export async function processWebhookOnce(store: WebhookEventStore, source: string, eventId: string, handler: () => Promise<void>): Promise<"processed" | "duplicate"> {
  if (!(await store.record(source, eventId))) return "duplicate";
  await handler();
  return "processed";
}

/**
 * Polls the provider until installation data is present (default every 5 s for at most 3 min).
 * Returns null when the time runs out; the scheduled status poll takes over from there.
 */
export async function pollUntilReady<T>(
  fetchOnce: () => Promise<T>,
  isReady: (v: T) => boolean,
  opts: { intervalMs?: number; maxMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T | null> {
  const interval = opts.intervalMs ?? 5000;
  const max = opts.maxMs ?? 180_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  for (let waited = 0; waited <= max; waited += interval) {
    try {
      const v = await fetchOnce();
      if (isReady(v)) return v;
    } catch {
      // status reads are safe to repeat
    }
    if (waited + interval > max) break;
    await sleep(interval);
  }
  return null;
}
