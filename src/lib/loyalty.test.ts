import { describe, expect, it } from "vitest";
import { cashbackCents, LOYALTY_TIERS, maxRedeemCents, nextTier, tierForSpend } from "./loyalty";

describe("GlobeMoney Stufen", () => {
  it("5 %, 6 %, 7 % und 10 % ab 0, 18, 60 und 140 €", () => {
    expect(LOYALTY_TIERS.map((t) => [t.fromCents, t.rate])).toEqual([[0, 0.05], [1800, 0.06], [6000, 0.07], [14000, 0.1]]);
  });
  it("wählt die richtige Stufe an den Grenzen", () => {
    expect(tierForSpend(0).id).toBe("traveler");
    expect(tierForSpend(1799).id).toBe("traveler");
    expect(tierForSpend(1800).id).toBe("silver");
    expect(tierForSpend(5999).id).toBe("silver");
    expect(tierForSpend(6000).id).toBe("gold");
    expect(tierForSpend(14000).id).toBe("platinum");
    expect(tierForSpend(99999).id).toBe("platinum");
  });
  it("sagt, was bis zur nächsten Stufe fehlt", () => {
    expect(nextTier(1000)).toMatchObject({ tier: { id: "silver" }, remainingCents: 800 });
    expect(nextTier(14000)).toBeNull();
  });
});

describe("GlobeMoney Gutschrift", () => {
  it("rundet ab und gibt nie negatives Guthaben", () => {
    expect(cashbackCents(1000, 0.05)).toBe(50);
    expect(cashbackCents(199, 0.05)).toBe(9);
    expect(cashbackCents(1999, 0.1)).toBe(199);
    expect(cashbackCents(0, 0.1)).toBe(0);
    expect(cashbackCents(-500, 0.1)).toBe(0);
    expect(cashbackCents(Number.NaN, 0.1)).toBe(0);
  });
});

describe("GlobeMoney Einlösen", () => {
  it("höchstens die Hälfte der Bestellung und nie mehr als der Kontostand", () => {
    expect(maxRedeemCents(1000, 10_000)).toBe(500);
    expect(maxRedeemCents(1000, 120)).toBe(120);
    expect(maxRedeemCents(1000, 0)).toBe(0);
  });
  it("lässt mindestens 0,50 € in bar übrig (Stripe-Minimum)", () => {
    expect(maxRedeemCents(80, 10_000)).toBe(30);
    expect(maxRedeemCents(50, 10_000)).toBe(0);
    expect(maxRedeemCents(40, 10_000)).toBe(0);
  });
  it("ungültige Werte ergeben 0", () => {
    expect(maxRedeemCents(Number.NaN, 100)).toBe(0);
    expect(maxRedeemCents(1000, -5)).toBe(0);
  });
});
