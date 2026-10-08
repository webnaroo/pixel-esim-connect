// Pure fulfillment core. I/O is injected so the "never deliver twice" rules are testable.
import type { EsimDetails, ProviderOrderResult } from "./providers/types";

export const MAX_FULFILLMENT_ATTEMPTS = 3;

/** Growing delay before the next attempt: 1 min, 5 min, 25 min. */
export function backoffSeconds(attempt: number): number {
  return 60 * 5 ** Math.max(0, attempt - 1);
}

export type ClaimedOrder = { id: string; attempts: number; idempotencyKey: string; providerPlanId: string; email: string };

export interface FulfillmentStore {
  /** Atomically moves a paid order to 'fulfilling'. Returns null when someone else holds it or it is not due. */
  claim(orderId: string, maxAttempts: number): Promise<ClaimedOrder | null>;
  markFulfilled(orderId: string, providerOrderId: string, esim: EsimDetails | undefined): Promise<void>;
  scheduleRetry(orderId: string, at: Date, error: string): Promise<void>;
  markFailed(orderId: string, error: string): Promise<void>;
}

export type FulfillDeps = {
  store: FulfillmentStore;
  createOrder: (input: { providerPlanId: string; customerEmail: string; idempotencyKey: string }) => Promise<ProviderOrderResult>;
  now?: () => Date;
};

export type FulfillOutcome = "skipped" | "fulfilled" | "retry_scheduled" | "failed";

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
