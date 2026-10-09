import { describe, expect, it, vi, beforeEach } from "vitest";
import { computePrice, type PricingRule } from "./pricing";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), plans: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: async (from: number) => ({ data: from === 0 ? mocks.plans : [], error: null }) }) }) }) }),
} }));
vi.mock("./pricing-context.server", () => ({ loadPricingContext: async () => ({
  rules: [{ id: "rule", scope: "global", scope_ref: null, type: "percent", value: 25, rounding: "49_99", priority: 0 }],
  settings: [], policy: { fees: { percent: 2.9, fixed: 0.3 }, minNet: 0 }, fx: { buffer: 3.5 },
  calculate: (input: Parameters<typeof computePrice>[0], rules: PricingRule[]) => ({ price: computePrice(input, rules, () => 1, 0.19), source: "global", inputs: { rate: 1 } }),
}) }));
import { preparePriceChange, applyPreparedPrices } from "./price-recalculation.server";

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.plans = [{ id: "p", provider_plan_id: "P1", type: "data", cost_price: 10, cost_currency: "EUR", sell_price: 14.99, price_override: null, updated_at: "2026-10-09T00:00:00Z", destination: { slug: "turkey" }, is_active: false, released: false }];
});
describe("atomic confirmed price recalculation", () => {
  it("previews margin 55 without writing and preserves visibility", async () => {
    const result = await preparePriceChange({ kind: "update", id: "rule", rule: { id: "rule", scope: "global", scope_ref: null, type: "percent", value: 55, rounding: "49_99", priority: 0 } });
    expect(result.counts.changed).toBe(1);
    expect(result.rows[0]?.gross).toBe(18.49);
    expect(result.rows[0]).not.toHaveProperty("is_active");
    expect(result.rows[0]).not.toHaveProperty("released");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("preserves explicitly overridden price", async () => {
    const row = mocks.plans[0];
    if (!row) throw new Error("missing fixture");
    row["price_override"] = 13.99; row["sell_price"] = 13.99;
    const prepared = await preparePriceChange({ kind: "recalculate" });
    expect(prepared.counts.overridden).toBe(1);
    expect(prepared.rows[0]?.gross).toBe(13.99);
  });
  it("passes old/new rules and all prices to one atomic write", async () => {
    const prepared = await preparePriceChange({ kind: "recalculate" });
    mocks.rpc.mockResolvedValue({ error: null });
    expect(await applyPreparedPrices(prepared, "admin")).toMatchObject({ calculated: 1, activated: 0, hidden: 0 });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("apply_price_calculation", expect.objectContaining({ _actor: "admin", _rows: prepared.rows, _rules_before: prepared.rulesBefore }));
  });
  it("does not report success when atomic commit rejects stale data", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "price_preview_stale" } });
    await expect(applyPreparedPrices(await preparePriceChange({ kind: "recalculate" }), "admin")).rejects.toThrow("Daten haben sich geändert");
  });
});