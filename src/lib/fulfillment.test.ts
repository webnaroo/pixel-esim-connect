import { describe, expect, it, vi } from "vitest";
import { backoffSeconds, fulfillOrder, MAX_FULFILLMENT_ATTEMPTS, pollUntilReady, processWebhookOnce, type FulfillmentStore } from "./fulfillment";
import { ProviderRequestError } from "./providers/types";

type Row = { status: string; attempts: number; nextAt: number | null; error?: string };

// Mirrors claim_order_for_fulfillment: paid, or fulfilling with a due retry. Synchronous check-and-set = atomic.
function memoryStore(clock: { t: number }) {
  const rows = new Map<string, Row>([["o1", { status: "paid", attempts: 0, nextAt: null }]]);
  const claims: number[] = [];
  const store: FulfillmentStore = {
    async claim(id, max) {
      const r = rows.get(id)!;
      const due = r.nextAt == null || r.nextAt <= clock.t;
      const claimable = (r.status === "paid" && due) || (r.status === "fulfilling" && r.nextAt != null && due);
      if (!claimable || r.attempts >= max) return null;
      r.status = "fulfilling"; r.attempts++; r.nextAt = null;
      claims.push(clock.t);
      return { id, attempts: r.attempts, idempotencyKey: "idem-1", providerPlanId: "p1", email: "a@b.de" };
    },
    async markFulfilled(id) { rows.get(id)!.status = "fulfilled"; },
    async scheduleRetry(id, at, error) { const r = rows.get(id)!; r.status = "fulfilling"; r.nextAt = at.getTime(); r.error = error; },
    async markFailed(id, error) { const r = rows.get(id)!; r.status = "fulfillment_failed"; r.error = error; },
    async markNeedsReview(id, error) { const r = rows.get(id)!; r.status = "needs_review"; r.error = error; r.nextAt = null; },
  };
  return { rows, store, claims };
}

const ok = async () => ({ providerOrderId: "prov-1", status: "ready" as const });
const MIN = 60_000;

describe("fulfillOrder", () => {
  it("duplicate webhook delivers only once", async () => {
    const { store, rows } = memoryStore({ t: 0 });
    const createOrder = vi.fn(ok);
    const seen = new Set<string>();
    const events = { record: async (s: string, id: string) => (seen.has(s + id) ? false : (seen.add(s + id), true)) };
    const run = () => processWebhookOnce(events, "stripe", "evt_1", async () => { await fulfillOrder({ store, createOrder }, "o1"); });
    expect(await run()).toBe("processed");
    expect(await run()).toBe("duplicate");
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(rows.get("o1")!.status).toBe("fulfilled");
  });

  it("concurrent fulfill-order calls create exactly one provider order", async () => {
    const { store } = memoryStore({ t: 0 });
    const createOrder = vi.fn(ok);
    const results = await Promise.all(Array.from({ length: 5 }, () => fulfillOrder({ store, createOrder }, "o1")));
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r === "skipped")).toHaveLength(4);
  });

  it("a 'fulfilling' order is retried exactly 1, 5 and 25 minutes after each failure", async () => {
    const clock = { t: 0 };
    const { store, rows, claims } = memoryStore(clock);
    const createOrder = vi.fn().mockRejectedValue(new ProviderRequestError("HTTP 503", 503, "createOrder"));
    const deps = { store, createOrder, now: () => new Date(clock.t) };
    // Scheduler ticks every minute for 40 minutes.
    for (let m = 0; m <= 40; m++) { clock.t = m * MIN; await fulfillOrder(deps, "o1"); }
    expect(claims).toEqual([0, 1 * MIN, 6 * MIN, 31 * MIN]); // +1, +5, +25
    expect(createOrder).toHaveBeenCalledTimes(MAX_FULFILLMENT_ATTEMPTS);
    expect(rows.get("o1")!.status).toBe("fulfillment_failed");
  });

  it("while waiting for a retry the order stays 'fulfilling' and is not claimed early", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
    const createOrder = vi.fn().mockRejectedValueOnce(new ProviderRequestError("HTTP 503", 503, "createOrder")).mockImplementation(ok);
    const deps = { store, createOrder, now: () => new Date(clock.t) };
    expect(await fulfillOrder(deps, "o1")).toBe("retry_scheduled");
    expect(rows.get("o1")!.status).toBe("fulfilling");
    clock.t = MIN - 1;
    expect(await fulfillOrder(deps, "o1")).toBe("skipped");
    clock.t = MIN;
    expect(await fulfillOrder(deps, "o1")).toBe("fulfilled");
    expect(createOrder.mock.calls.map((c) => c[0].idempotencyKey)).toEqual(["idem-1", "idem-1"]);
    expect(await fulfillOrder(deps, "o1")).toBe("skipped");
  });

  it("stored error never contains activation data", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
    const deps = { store, createOrder: vi.fn().mockRejectedValue(new ProviderRequestError("down LPA:1$smdp.example$SECRET", 500, "createOrder")), now: () => new Date(clock.t) };
    await fulfillOrder(deps, "o1");
    expect(rows.get("o1")!.error).not.toContain("SECRET");
  });

  it("backoff grows: 1, 5, 25 minutes", () => {
    expect([1, 2, 3].map(backoffSeconds)).toEqual([60, 300, 1500]);
  });
});

describe("unknown provider outcome (no blind POST retry)", () => {
  it("timeout on POST sets needs_review and never posts a second time", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    const createOrder = vi.fn().mockRejectedValue(timeout);
    expect(await fulfillOrder({ store, createOrder, now: () => new Date(clock.t) }, "o1")).toBe("needs_review");
    expect(rows.get("o1")!.status).toBe("needs_review");
    for (const t of [1, 6, 31, 120]) {
      clock.t = t * MIN;
      expect(await fulfillOrder({ store, createOrder, now: () => new Date(clock.t) }, "o1")).toBe("skipped");
    }
    expect(createOrder).toHaveBeenCalledTimes(1);
  });

  it("parallel fulfill calls create only one provider order", async () => {
    const { store } = memoryStore({ t: 0 });
    const createOrder = vi.fn(ok);
    await Promise.all([1, 2, 3].map(() => fulfillOrder({ store, createOrder }, "o1")));
    expect(createOrder).toHaveBeenCalledTimes(1);
  });
});

describe("pollUntilReady", () => {
  it("polls every 5 s until the eSIM has installation data", async () => {
    const sleeps: number[] = [];
    let n = 0;
    const r = await pollUntilReady(async () => ({ ready: ++n >= 4 }), (v) => v.ready, { sleep: async (ms) => { sleeps.push(ms); } });
    expect(r).toEqual({ ready: true });
    expect(n).toBe(4);
    expect(sleeps).toEqual([5000, 5000, 5000]);
  });
  it("gives up after 3 minutes and leaves the rest to the scheduled poll", async () => {
    let n = 0;
    const r = await pollUntilReady(async () => { n++; return false; }, (v) => v, { sleep: async () => {} });
    expect(r).toBeNull();
    expect(n).toBe(37); // t = 0, 5, ..., 180 s
  });
});
