import { describe, it, expect, vi } from "vitest";
import { autoRefundDecision, runAutoRefunds, refundIdempotencyKey, AUTO_REFUND_DELAY_MS, type AutoRefundDeps, type RefundCandidate } from "./auto-refund";

const NOW = new Date("2026-10-09T12:00:00Z");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const cand = (p: Partial<RefundCandidate> = {}): RefundCandidate => ({ id: "o1", status: "fulfillment_failed", failedAt: ago(31), paymentIntentId: "pi_1", refundStartedAt: null, installDataIssued: false, ...p });

function deps(list: RefundCandidate[], enabled = true) {
  const claimed = new Set<string>();
  const stripeKeys = new Map<string, string>();
  const d = {
    enabled: async () => enabled,
    candidates: async () => list,
    claim: vi.fn(async (id: string) => (claimed.has(id) ? false : (claimed.add(id), true))),
    release: vi.fn(async () => {}),
    // Stripe semantics: same idempotency key -> same refund, never a second one
    refund: vi.fn(async (_id: string, _pi: string, key: string) => { if (!stripeKeys.has(key)) stripeKeys.set(key, `re_${stripeKeys.size + 1}`); return { refundId: stripeKeys.get(key)! }; }),
    markRefunded: vi.fn(async () => {}),
    notify: vi.fn(async () => {}),
    now: () => NOW,
  };
  return Object.assign(d satisfies AutoRefundDeps, { stripeKeys });
}

describe("automatische Erstattung", () => {
  it("eindeutig fehlgeschlagen -> Erstattung erst nach 30 Minuten", async () => {
    expect(AUTO_REFUND_DELAY_MS).toBe(30 * 60_000);
    expect(autoRefundDecision(cand({ failedAt: ago(29) }), NOW, true)).toEqual({ refund: false, reason: "too_early" });
    const d = deps([cand({ failedAt: ago(30) })]);
    expect((await runAutoRefunds(d)).refunded).toEqual(["o1"]);
    expect(d.refund).toHaveBeenCalledWith("o1", "pi_1", "refund-o1");
    expect(d.markRefunded).toHaveBeenCalledWith("o1", "re_1");
    expect(d.notify).toHaveBeenCalledTimes(1);
  });
  it("needs_review -> keine Erstattung", async () => {
    const d = deps([cand({ status: "needs_review" })]);
    await runAutoRefunds(d);
    expect(d.refund).not.toHaveBeenCalled();
  });
  it("doppelter Aufruf -> genau eine Erstattung", async () => {
    const d = deps([cand()]);
    await Promise.all([runAutoRefunds(d), runAutoRefunds(d)]);
    await runAutoRefunds(d);
    expect(d.refund).toHaveBeenCalledTimes(1);
    expect(d.stripeKeys.size).toBe(1);
    expect(refundIdempotencyKey("o1")).toBe(refundIdempotencyKey("o1"));
  });
  it("ausgelieferte Installationsdaten -> keine Erstattung", async () => {
    const d = deps([cand({ installDataIssued: true })]);
    await runAutoRefunds(d);
    expect(d.refund).not.toHaveBeenCalled();
  });
  it("Schalter aus (Standard) -> keine Erstattung", async () => {
    const d = deps([cand()], false);
    await runAutoRefunds(d);
    expect(d.refund).not.toHaveBeenCalled();
  });
  it("Stripe-Fehler gibt die Bestellung wieder frei", async () => {
    const d = deps([cand()]);
    d.refund.mockRejectedValueOnce(new Error("stripe down"));
    expect((await runAutoRefunds(d)).errors).toBe(1);
    expect(d.release).toHaveBeenCalled();
    expect(d.markRefunded).not.toHaveBeenCalled();
  });
});
