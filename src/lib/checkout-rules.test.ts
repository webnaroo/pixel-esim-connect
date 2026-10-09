import { describe, expect, it } from "vitest";
import { checkoutAccess, checkoutRequestSchema } from "./checkout-rules";

const base = { planId: "8f14e45f-ceea-4e7a-9f6b-2b1f3c4d5e6f", email: "Gast@Example.de", withdrawalConsent: true, environment: "sandbox", returnOrigin: "https://globesim.example" };

describe("checkout request", () => {
  it("accepts displayed gross for comparison only", () => expect(checkoutRequestSchema.parse({ ...base, displayedGross: 1.99 }).displayedGross).toBe(1.99));
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

describe("admin checkout while shop is disabled", () => {
  const input = { shopLive: false, isAdmin: true, paused: false, environment: "sandbox" as const };
  it("allows verified admins to start test payments", () => {
    expect(checkoutAccess(input)).toBeNull();
  });
  it("requires explicit consent for a real admin payment", () => {
    expect(checkoutAccess({ ...input, environment: "live" })).toBe("real_payment_consent_required");
    expect(checkoutAccess({ ...input, environment: "live", realPaymentConsent: true })).toBeNull();
  });
  it("never lets customers bypass the closed shop", () => {
    expect(checkoutAccess({ ...input, isAdmin: false, environment: "live", realPaymentConsent: true })).toBe("shop_unavailable");
  });
  it("keeps the emergency sales pause for admins", () => {
    expect(checkoutAccess({ ...input, paused: true })).toBe("shop_unavailable");
  });
  it("does not allow sandbox payments in the public live shop", () => {
    expect(checkoutAccess({ ...input, shopLive: true })).toBe("shop_unavailable");
  });
});
