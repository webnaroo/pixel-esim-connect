import { describe, expect, it } from "vitest";
import { canEnableShop, evaluateSyncThreshold, shopChecklistMissing } from "./admin-rules";

describe("catalog sync 50 % guard", () => {
  it("aborts below half of the previous active plans", () => expect(evaluateSyncThreshold(100, 49).abort).toBe(true));
  it("continues at exactly half", () => expect(evaluateSyncThreshold(100, 50).abort).toBe(false));
  it("aborts when the provider returns nothing", () => expect(evaluateSyncThreshold(10, 0).abort).toBe(true));
  it("first sync with an empty catalog is allowed", () => expect(evaluateSyncThreshold(0, 0).abort).toBe(false));
});

describe("shop switch checklist", () => {
  const green = { providerReachable: true, providerSandbox: false, catalogCount: 3, stripeConfigured: true };
  it("allows enabling when everything is green", () => expect(canEnableShop(green)).toBe(true));
  it("blocks when the provider is unreachable", () => expect(shopChecklistMissing({ ...green, providerReachable: false })).toEqual(["Provider erreichbar"]));
  it("blocks with an empty catalog", () => expect(canEnableShop({ ...green, catalogCount: 0 })).toBe(false));
  it("blocks with an eSIMerge sandbox key", () => expect(canEnableShop({ ...green, providerSandbox: true })).toBe(false));
  it("blocks without Stripe", () => expect(canEnableShop({ ...green, stripeConfigured: false })).toBe(false));
});
