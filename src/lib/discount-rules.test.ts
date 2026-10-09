import { describe, expect, it } from "vitest";
import {
  discountAmount,
  discountedTotals,
  discountRejection,
  isCodeFormatValid,
  normalizeCode,
  type DiscountRow,
} from "./discount-rules";

const row = (over: Partial<DiscountRow> = {}): DiscountRow => ({
  type: "percent", value: 10, active: true, valid_until: null, max_uses: null, times_used: 0, ...over,
});

describe("normalizeCode", () => {
  it("trims, uppercases and removes spaces", () => {
    expect(normalizeCode("  som mer 10 ")).toBe("SOMMER10");
  });
});

describe("isCodeFormatValid", () => {
  it("accepts letters, digits, dash and underscore from 3 chars", () => {
    expect(isCodeFormatValid("ABC")).toBe(true);
    expect(isCodeFormatValid("WELCOME5")).toBe(true);
    expect(isCodeFormatValid("UMUT-2026_X")).toBe(true);
  });
  it("rejects too short, special chars and leading dash", () => {
    expect(isCodeFormatValid("AB")).toBe(false);
    expect(isCodeFormatValid("-ABC")).toBe(false);
    expect(isCodeFormatValid("RABATT!")).toBe(false);
    expect(isCodeFormatValid("")).toBe(false);
  });
});

describe("discountRejection", () => {
  it("accepts an active, unexpired code", () => {
    expect(discountRejection(row(), "SOMMER10")).toBeNull();
  });
  it("rejects invalid format before anything else", () => {
    expect(discountRejection(row(), "XX")).toBe("invalid_format");
  });
  it("rejects inactive codes", () => {
    expect(discountRejection(row({ active: false }), "SOMMER10")).toBe("inactive");
  });
  it("rejects expired codes", () => {
    expect(discountRejection(row({ valid_until: "2020-01-01T00:00:00Z" }), "SOMMER10")).toBe("expired");
    expect(discountRejection(row({ valid_until: "2099-01-01T00:00:00Z" }), "SOMMER10")).toBeNull();
  });
  it("rejects exhausted codes at the limit", () => {
    expect(discountRejection(row({ max_uses: 5, times_used: 5 }), "SOMMER10")).toBe("exhausted");
    expect(discountRejection(row({ max_uses: 5, times_used: 4 }), "SOMMER10")).toBeNull();
  });
});

describe("discountAmount", () => {
  it("computes percent on the gross price, rounded to cents", () => {
    expect(discountAmount({ type: "percent", value: 10 }, 23.49)).toBe(2.35);
  });
  it("computes fixed amounts", () => {
    expect(discountAmount({ type: "fixed", value: 5 }, 23.49)).toBe(5);
  });
  it("never exceeds the gross price", () => {
    expect(discountAmount({ type: "fixed", value: 50 }, 23.49)).toBe(23.49);
    expect(discountAmount({ type: "percent", value: 100 }, 23.49)).toBe(23.49);
  });
});

describe("discountedTotals", () => {
  it("splits the discounted gross proportionally", () => {
    const t = discountedTotals(23.49, 2.35, 0.19);
    expect(t.gross).toBe(21.14);
    expect(t.net + t.vat).toBeCloseTo(21.14, 2);
    expect(t.vat).toBeLessThan(t.net);
  });
  it("keeps totals consistent when the code zeroes the price", () => {
    const t = discountedTotals(9.99, 9.99, 0.19);
    expect(t.gross).toBe(0);
    expect(t.net).toBe(0);
    expect(t.vat).toBe(0);
  });
});
