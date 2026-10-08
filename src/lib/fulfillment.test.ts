import { describe, expect, it, vi } from "vitest";
import { backoffSeconds, fulfillOrder, MAX_FULFILLMENT_ATTEMPTS, processWebhookOnce, type FulfillmentStore } from "./fulfillment";

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
    const createOrder = vi.fn().mockRejectedValue(new Error("timeout"));
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
    const createOrder = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockImplementation(ok);
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
    const deps = { store, createOrder: vi.fn().mockRejectedValue(new Error("down LPA:1$smdp.example$SECRET")), now: () => new Date(clock.t) };
    await fulfillOrder(deps, "o1");
    expect(rows.get("o1")!.error).not.toContain("SECRET");
  });

  it("backoff grows: 1, 5, 25 minutes", () => {
    expect([1, 2, 3].map(backoffSeconds)).toEqual([60, 300, 1500]);
  });
});
