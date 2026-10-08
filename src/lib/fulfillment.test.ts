import { describe, expect, it, vi } from "vitest";
import { backoffSeconds, fulfillOrder, MAX_FULFILLMENT_ATTEMPTS, processWebhookOnce, type FulfillmentStore } from "./fulfillment";

type Row = { status: string; attempts: number; nextAt: number | null; error?: string };

function memoryStore(clock: { t: number }) {
  const rows = new Map<string, Row>([["o1", { status: "paid", attempts: 0, nextAt: null }]]);
  const store: FulfillmentStore = {
    async claim(id, max) {
      const r = rows.get(id)!;
      if (r.status !== "paid" || r.attempts >= max || (r.nextAt != null && r.nextAt > clock.t)) return null;
      r.status = "fulfilling"; r.attempts++; r.nextAt = null; // synchronous check-and-set = atomic
      return { id, attempts: r.attempts, idempotencyKey: "idem-1", providerPlanId: "p1", email: "a@b.de" };
    },
    async markFulfilled(id) { rows.get(id)!.status = "fulfilled"; },
    async scheduleRetry(id, at, error) { const r = rows.get(id)!; r.status = "paid"; r.nextAt = at.getTime(); r.error = error; },
    async markFailed(id, error) { const r = rows.get(id)!; r.status = "fulfillment_failed"; r.error = error; },
  };
  return { rows, store };
}

const ok = async () => ({ providerOrderId: "prov-1", status: "ready" as const });

describe("fulfillOrder", () => {
  it("duplicate webhook delivers only once", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
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

  it("retries after a failure with the same idempotency key and growing delays", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
    const createOrder = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockImplementation(ok);
    const deps = { store, createOrder, now: () => new Date(clock.t) };
    expect(await fulfillOrder(deps, "o1")).toBe("retry_scheduled");
    expect(rows.get("o1")!.nextAt).toBe(60_000);
    expect(await fulfillOrder(deps, "o1")).toBe("skipped"); // not due yet
    clock.t = 60_000;
    expect(await fulfillOrder(deps, "o1")).toBe("fulfilled");
    expect(createOrder.mock.calls.map((c) => c[0].idempotencyKey)).toEqual(["idem-1", "idem-1"]);
    expect(await fulfillOrder(deps, "o1")).toBe("skipped"); // already fulfilled
  });

  it("marks fulfillment_failed after 3 attempts", async () => {
    const clock = { t: 0 };
    const { store, rows } = memoryStore(clock);
    const createOrder = vi.fn().mockRejectedValue(new Error("down LPA:1$smdp.example$SECRET"));
    const deps = { store, createOrder, now: () => new Date(clock.t) };
    const outcomes = [];
    for (let i = 0; i < 5; i++) { outcomes.push(await fulfillOrder(deps, "o1")); clock.t += 3_600_000; }
    expect(outcomes).toEqual(["retry_scheduled", "retry_scheduled", "failed", "skipped", "skipped"]);
    expect(createOrder).toHaveBeenCalledTimes(MAX_FULFILLMENT_ATTEMPTS);
    expect(rows.get("o1")!.status).toBe("fulfillment_failed");
    expect(rows.get("o1")!.error).not.toContain("SECRET");
  });

  it("backoff grows: 1, 5, 25 minutes", () => {
    expect([1, 2, 3].map(backoffSeconds)).toEqual([60, 300, 1500]);
  });
});
