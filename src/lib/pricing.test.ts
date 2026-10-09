import { describe, expect, it } from "vitest";
import { computePrice, roundTo4999, selectRule, type PricingRule } from "./pricing";

const input = { providerPlanId: "P1", destinationSlug: "turkey", planType: "data" as const, costPrice: 10, costCurrency: "EUR" };
const rule = (over: Partial<PricingRule>): PricingRule => ({ id: "r", scope: "global", scope_ref: null, type: "percent", value: 0, rounding: null, priority: 0, ...over });
const eurOnly = () => null;

describe("rounding to ,49 / ,99", () => {
  it("rounds up to ,49", () => expect(roundTo4999(12.1)).toBe(12.49));
  it("rounds up to ,99", () => expect(roundTo4999(12.5)).toBe(12.99));
  it("keeps exact ,49 and ,99", () => {
    expect(roundTo4999(12.49)).toBe(12.49);
    expect(roundTo4999(12.99)).toBe(12.99);
  });
  it("rounds ,00 up to ,49", () => expect(roundTo4999(13)).toBe(13.49));
});

describe("net and gross", () => {
  it("separates net, VAT and gross at 19 %", () => {
    const r = computePrice(input, [rule({ value: 50 })], eurOnly, 0.19);
    // 10 € cost + 50 % = 15 € net → 17,85 € gross
    expect(r).toMatchObject({ ok: true, net: 15, vat: 2.85, gross: 17.85 });
  });
  it("derives net from the rounded gross", () => {
    const r = computePrice(input, [rule({ value: 50, rounding: "49_99" })], eurOnly, 0.19);
    expect(r).toMatchObject({ ok: true, gross: 17.99, net: 15.12, vat: 2.87 });
  });
});

describe("missing exchange rate", () => {
  it("returns no price instead of a wrong one", () => {
    const r = computePrice({ ...input, costCurrency: "USD" }, [rule({ value: 50 })], () => null, 0.19);
    expect(r).toEqual({ ok: false, reason: "missing_fx" });
  });
  it("converts when a rate exists", () => {
    const r = computePrice({ ...input, costCurrency: "USD" }, [rule({ value: 0 })], () => 0.5, 0);
    expect(r).toMatchObject({ ok: true, gross: 5 });
  });
});

describe("rule precedence", () => {
  const rules = [
    rule({ id: "global", value: 10 }),
    rule({ id: "type", scope: "plan_type", scope_ref: "data", value: 20 }),
    rule({ id: "country", scope: "country", scope_ref: "turkey", value: 30 }),
    rule({ id: "plan", scope: "plan", scope_ref: "P1", value: 40 }),
  ];
  it("plan beats country", () => expect(selectRule(input, rules)?.id).toBe("plan"));
  it("country beats plan type", () => expect(selectRule(input, rules.filter((r) => r.id !== "plan"))?.id).toBe("country"));
  it("plan type beats global", () => expect(selectRule(input, rules.filter((r) => r.scope === "plan_type" || r.scope === "global"))?.id).toBe("type"));
  it("falls back to global", () => expect(selectRule({ ...input, destinationSlug: "japan", planType: "unlimited", providerPlanId: "X" }, rules)?.id).toBe("global"));
  it("higher priority wins within a scope", () => {
    const r = selectRule(input, [rule({ id: "a", priority: 1 }), rule({ id: "b", priority: 5 })]);
    expect(r?.id).toBe("b");
  });
  it("no rule means no price", () => expect(computePrice(input, [], eurOnly, 0.19)).toEqual({ ok: false, reason: "no_rule" }));
});

import { computeMargin, parseFeeSettings, parseMinNet } from "./pricing";
describe("net result after payment fee", () => {
  it("uses 2,9 % + 0,30 € by default on the gross price", () => {
    const m = computeMargin(10, 15.12, 17.99, parseFeeSettings(null), parseMinNet(null));
    // fee 17,99 × 2,9 % = 0,52 + 0,30 = 0,82 → 15,12 − 10 − 0,82 = 4,30 → 43 % of cost
    expect(m).toMatchObject({ fee: 0.82, result: 4.3, resultPercent: 43, belowMin: false });
  });
  it("flags results below an explicit minimum", () => {
    expect(computeMargin(10, 11.4, 13.57, parseFeeSettings(null), 1.5).belowMin).toBe(true);
  });
  it("respects a custom minimum", () => {
    expect(computeMargin(10, 15.12, 17.99, { percent: 2.9, fixed: 0.3 }, 5).belowMin).toBe(true);
  });
});

describe("25 % margin with ,49/,99 rounding", () => {
  it("prices a 10 EUR cost at 14,99 gross", () => {
    const r = computePrice(input, [rule({ value: 25, rounding: "49_99" })], eurOnly, 0.19);
    expect(r).toMatchObject({ ok: true, gross: 14.99, net: 12.6 });
  });
});
