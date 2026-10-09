import { describe, expect, it } from "vitest";
import { orderSteps, type StepState } from "./order-steps";

type Keys = "order" | "payment" | "install";

const states = (status: string): Record<Keys, StepState> =>
  Object.fromEntries(orderSteps(status).map((s) => [s.key, s.state])) as Record<Keys, StepState>;

describe("orderSteps", () => {
  it("shows the order step as done for every status", () => {
    for (const status of ["pending", "paid", "fulfilled", "cancelled", "refunded", "needs_review"]) {
      expect(states(status).order).toBe("done");
    }
  });

  it("keeps payment open and install not started while payment is pending", () => {
    expect(states("pending")).toEqual({ order: "done", payment: "current", install: "open" });
  });

  it("marks payment done and install as next while the eSIM is being made", () => {
    expect(states("paid")).toEqual({ order: "done", payment: "done", install: "current" });
    expect(states("fulfilling")).toEqual({ order: "done", payment: "done", install: "current" });
  });

  it("shows install as done once the eSIM is ready", () => {
    expect(states("fulfilled")).toEqual({ order: "done", payment: "done", install: "done" });
  });

  it("never shows install as next for a closed order", () => {
    expect(states("refunded")).toEqual({ order: "done", payment: "done", install: "open" });
    expect(states("cancelled")).toEqual({ order: "done", payment: "open", install: "open" });
  });

  it("says a refunded order does not need installing", () => {
    const install = orderSteps("refunded").find((s) => s.key === "install");
    expect(install?.note).toBe("Entfällt bei dieser Bestellung.");
  });
});
