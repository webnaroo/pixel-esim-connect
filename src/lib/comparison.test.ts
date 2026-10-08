import { describe, expect, it } from "vitest";
import { buildComparison, factLight, type ComparisonRowRec, type Competitor, type FactRec } from "./comparison";

const now = new Date("2026-10-08T12:00:00Z");
const comp = (id: string, n = 1): Competitor => ({ id, name: id, slug: id, logo_url: null, enabled: true, sort_order: n });
const row = (id: string, p: Partial<ComparisonRowRec> = {}): ComparisonRowRec => ({ id, sort_order: 1, question: "Q?", globesim_text: "G", globesim_status: "check", requires: null, enabled: true, ...p });
const fact = (row_id: string, competitor_id: string, p: Partial<FactRec> = {}): FactRec => ({ id: row_id + competitor_id, row_id, competitor_id, text: "T", status: "neutral", source_url: "https://example.com", checked_at: "2026-09-01", enabled: true, ...p });
const ctx = { hasUnlimitedPlans: true, supportHours: "Mo–Fr", destinationCount: 7 };
const build = (rows: ComparisonRowRec[], facts: FactRec[], competitors = [comp("a"), comp("b", 2)], c = ctx) => buildComparison({ competitors, rows, facts, ctx: c, now });

describe("comparison", () => {
  it("drops a fact without source", () => {
    const v = build([row("r1"), row("r2")], [fact("r1", "a", { source_url: null }), fact("r2", "a")]);
    expect(v!.competitors[0].rows.map((r) => r.id)).toEqual(["r2"]);
  });
  it("drops a non-https source", () => {
    expect(build([row("r1")], [fact("r1", "a", { source_url: "http://x.de" })])).toBeNull();
  });
  it("drops a fact checked more than 90 days ago, keeps exactly 90", () => {
    expect(build([row("r1")], [fact("r1", "a", { checked_at: "2026-07-09" })])).toBeNull();
    expect(build([row("r1")], [fact("r1", "a", { checked_at: "2026-07-10" })])).not.toBeNull();
  });
  it("hides a competitor without valid rows from the picker", () => {
    const v = build([row("r1")], [fact("r1", "a"), fact("r1", "b", { enabled: false })]);
    expect(v!.competitors.map((c) => c.id)).toEqual(["a"]);
  });
  it("returns null when nothing is valid (section not rendered)", () => {
    expect(build([row("r1", { enabled: false })], [fact("r1", "a")])).toBeNull();
  });
  it("hides GlobeSIM statement whose condition is unmet", () => {
    const rows = [row("r1", { requires: "unlimited_plans" }), row("r2", { requires: "destination_count", globesim_text: "{count} Ziele" })];
    const facts = [fact("r1", "a"), fact("r2", "a")];
    expect(build(rows, facts, [comp("a")], { ...ctx, hasUnlimitedPlans: false })!.competitors[0].rows.map((r) => r.id)).toEqual(["r2"]);
    expect(build(rows, facts, [comp("a")], { ...ctx, hasUnlimitedPlans: false })!.competitors[0].rows[0].globesim.text).toBe("7 Ziele");
    expect(build(rows, facts, [comp("a")], { hasUnlimitedPlans: false, supportHours: null, destinationCount: 0 })).toBeNull();
  });
  it("reports newest checked_at", () => {
    expect(build([row("r1"), row("r2")], [fact("r1", "a"), fact("r2", "b", { checked_at: "2026-10-01" })])!.latestCheckedAt).toBe("2026-10-01");
  });
  it("traffic light 60/90", () => {
    expect(factLight("2026-08-10", now)).toBe("green");
    expect(factLight("2026-08-09", now)).toBe("yellow");
    expect(factLight("2026-07-09", now)).toBe("red");
  });
});
