import { describe, expect, it } from "vitest";
import { decidePayment } from "./payment-events";

const order = { status: "pending", amount: 14.99, currency: "EUR", stripeEnv: "sandbox" };
const paid = { amountTotal: 1499, currency: "eur", paymentStatus: "paid", env: "sandbox" as const };

describe("decidePayment", () => {
  it("marks paid only when amount and currency match the server order", () => {
    expect(decidePayment(order, paid)).toEqual({ action: "mark_paid" });
  });
  it("different amount -> mismatch, no delivery", () => {
    expect(decidePayment(order, { ...paid, amountTotal: 1 }).action).toBe("mismatch");
  });
  it("different currency -> mismatch", () => {
    expect(decidePayment(order, { ...paid, currency: "usd" }).action).toBe("mismatch");
  });
  it("test payment for a live order -> mismatch", () => {
    expect(decidePayment({ ...order, stripeEnv: "live" }, paid).action).toBe("mismatch");
  });
  it("unsettled payments and non-pending orders are ignored", () => {
    expect(decidePayment(order, { ...paid, paymentStatus: "unpaid" }).action).toBe("ignore");
    expect(decidePayment({ ...order, status: "paid" }, paid).action).toBe("ignore");
  });
});
