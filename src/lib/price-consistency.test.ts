import { describe, expect, it } from "vitest";
import { computePrice, type PricingRule } from "./pricing";
import { productScript } from "./seo";
import { priceFreshness } from "./price-refresh";

describe("one price for public offers and checkout", () => {
  it("changed markup yields identical Product offer and checkout cents", () => {
    const rule: PricingRule = { id: "global", scope: "global", scope_ref: null, type: "percent", value: 55, rounding: "49_99", priority: 0 };
    const result = computePrice({ providerPlanId: "p", destinationSlug: "turkey", planType: "data", costPrice: 10, costCurrency: "EUR" }, [rule], () => null, 0.19);
    if (!result.ok) throw new Error("missing price");
    const script = productScript({ name: "Türkei", plans: [{ price: result.gross }] }, "/countries/turkey")[0];
    if (!script) throw new Error("missing offer");
    expect(JSON.parse(script.children).offers.lowPrice).toBe("18.49");
    expect(Math.round(result.gross * 100)).toBe(1849);
  });
  it("refreshes foreground prices within 60 seconds and next navigation", () => {
    expect(priceFreshness.refetchInterval).toBe(30_000);
    expect(priceFreshness.staleTime).toBe(0);
  });
});