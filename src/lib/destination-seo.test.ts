import { describe, expect, it } from "vitest";
import { buildCountrySeo, buildRegionSeo, metaDescription, metaTitle, pick, planStats, type SeoPlan } from "./destination-seo";

const plan = (o: Partial<SeoPlan>): SeoPlan => ({ type: "data", dataMb: 1024, validityDays: 3, price: 1.99, networks: null, networkType: null, hotspot: null, topUpable: null, ...o });
const plans = [plan({}), plan({ dataMb: 3072, validityDays: 7, price: 4.5 }), plan({ dataMb: 10240, validityDays: 30, price: 12 })];

describe("destination seo", () => {
  it("computes stats from priced plans only", () => {
    const s = planStats([...plans, plan({ price: 0 })])!;
    expect(s.count).toBe(3);
    expect(s.fromPrice).toBe(1.99);
    expect(s.maxPrice).toBe(12);
    expect(s.gbOptions).toEqual([1, 3, 10]);
    expect(s.minDays).toBe(3);
    expect(s.maxDays).toBe(30);
  });
  it("returns null without priced plans", () => {
    expect(planStats([])).toBeNull();
    expect(buildCountrySeo({ slug: "x", name: "X", plans: [] })).toBeNull();
  });
  it("builds a text from real data, with highlights only for known slugs", () => {
    const t = buildCountrySeo({ slug: "turkey", name: "Türkei", plans })!;
    const all = JSON.stringify(t);
    expect(all).toContain("Türkei");
    expect(all).toContain("Istanbul");
    expect(all).not.toMatch(/(nach|in|für) Türkei/);
    expect(all).not.toContain("..");
    expect(all).toContain("1,99");
    const u = buildCountrySeo({ slug: "unknown-land", name: "Land", plans })!;
    expect(JSON.stringify(u)).not.toContain("Istanbul");
    expect(u.sections.length).toBe(t.sections.length - 1);
  });
  it("mentions networks, hotspot and top-up only when the data says so", () => {
    const base = JSON.stringify(buildCountrySeo({ slug: "a", name: "A", plans })!);
    expect(base).not.toContain("Hotspot (Internet teilen)");
    expect(base).not.toContain("nachbuchen");
    const rich = JSON.stringify(buildCountrySeo({ slug: "a", name: "A", plans: plans.map((p) => ({ ...p, networks: ["Vodafone"], hotspot: true, topUpable: true })) })!);
    expect(rich).toContain("Vodafone");
    expect(rich).toContain("Hotspot (Internet teilen)");
    expect(rich).toContain("nachbuchen");
  });
  it("never makes speed, coverage or unlimited claims", () => {
    const all = JSON.stringify(buildCountrySeo({ slug: "turkey", name: "Türkei", plans })!).toLowerCase();
    for (const bad of ["5g", "unbegrenzt", "24/7", "sofort", "beste abdeckung", "schnellste"]) expect(all).not.toContain(bad);
  });
  it("picks deterministically", () => {
    expect(pick("abc", ["x", "y", "z"])).toBe(pick("abc", ["x", "y", "z"]));
  });
  it("meta text stays short and includes the price", () => {
    const s = planStats(plans)!;
    expect(metaTitle("Türkei", s)).toContain("1,99");
    expect(metaDescription("Türkei", s)).toContain("eSIM Türkei ab 1,99");
    expect(metaDescription("Türkei", s).length).toBeLessThanOrEqual(160);
  });
  it("builds a region text", () => {
    const t = buildRegionSeo({ slug: "europe", name: "Europa", plans, countryNames: ["Spanien", "Italien"] })!;
    expect(JSON.stringify(t)).toContain("Spanien");
  });
});
