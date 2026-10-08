import { describe, expect, it } from "vitest";
import { signGuestToken, verifyGuestToken } from "./guest-token";

const S = "test-secret-only-for-unit-tests";
describe("guest token", () => {
  it("accepts a valid token for its own order", async () => {
    const t = await signGuestToken("order-a", S, 1000, 60);
    expect(await verifyGuestToken(t, "order-a", S, 1030)).toBe(true);
  });
  it("rejects expired tokens", async () => {
    const t = await signGuestToken("order-a", S, 1000, 60);
    expect(await verifyGuestToken(t, "order-a", S, 1061)).toBe(false);
  });
  it("rejects tokens for another order, tampered expiry or wrong secret", async () => {
    const t = await signGuestToken("order-a", S, 1000, 60);
    expect(await verifyGuestToken(t, "order-b", S, 1001)).toBe(false);
    expect(await verifyGuestToken(t.replace(/^\d+/, "999999"), "order-a", S, 1001)).toBe(false);
    expect(await verifyGuestToken(t, "order-a", "other", 1001)).toBe(false);
  });
});
