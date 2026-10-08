import { describe, expect, it } from "vitest";
import { checkoutRequestSchema } from "./checkout-rules";

const base = { planId: "8f14e45f-ceea-4e7a-9f6b-2b1f3c4d5e6f", email: "Gast@Example.de", withdrawalConsent: true, environment: "sandbox", returnOrigin: "https://globesim.example" };

describe("checkout request", () => {
  it("accepts plan, email and consent", () => {
    expect(checkoutRequestSchema.parse(base).email).toBe("gast@example.de");
  });
  it("rejects any client-sent price", () => {
    expect(checkoutRequestSchema.safeParse({ ...base, price: 0.01 }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...base, amount: 1 }).success).toBe(false);
  });
  it("requires the withdrawal checkbox", () => {
    expect(checkoutRequestSchema.safeParse({ ...base, withdrawalConsent: false }).success).toBe(false);
  });
});
