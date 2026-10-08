import { describe, expect, it } from "vitest";
import { groupDevices, isStale, matchesDevice, previewImport } from "./devices";

const H = "manufacturer,model,release_year,esim_supported,notes,source_url,checked_at";

describe("device search", () => {
  it("starts only from 3 characters", () => {
    expect(matchesDevice({ manufacturer: "Apple", model: "iPhone 15" }, "ip")).toBeNull();
  });
  it("ignores case and spaces", () => {
    expect(matchesDevice({ manufacturer: "Apple", model: "iPhone 15" }, "IPHONE15")).toBe(true);
    expect(matchesDevice({ manufacturer: "Apple", model: "iPhone 15" }, "pixel")).toBe(false);
  });
});

describe("grouping", () => {
  it("sorts models newest first", () => {
    const g = groupDevices([
      { manufacturer: "Apple", model: "iPhone 12", release_year: 2020 },
      { manufacturer: "Apple", model: "iPhone 15", release_year: 2023 },
    ]);
    expect(g[0].models.map((m) => m.model)).toEqual(["iPhone 15", "iPhone 12"]);
  });
});

describe("staleness", () => {
  it("warns after 12 months", () => {
    const now = new Date("2026-10-08");
    expect(isStale("2025-10-01", now)).toBe(true);
    expect(isStale("2025-11-01", now)).toBe(false);
  });
});

describe("csv import", () => {
  it("requires source and date, skips duplicates", () => {
    const csv = [H,
      "Apple,iPhone 15,2023,true,,https://example.com/a,2026-09-01",
      "apple , iphone15,2023,true,,https://example.com/a,2026-09-01",
      "Google,Pixel 8,2023,true,,,2026-09-01",
      "Google,Pixel 7,2022,true,,https://example.com/b,",
      "Samsung,Galaxy S24,2024,true,,https://example.com/c,2026-09-01",
    ].join("\n");
    const p = previewImport(csv, new Set(["samsung|galaxys24"]));
    expect(p.valid).toHaveLength(1);
    expect(p.duplicates.map((d) => d.line)).toEqual([3, 6]);
    expect(p.errors.map((e) => e.line)).toEqual([4, 5]);
  });
  it("reports missing columns", () => {
    expect(previewImport("manufacturer,model\nA,B", new Set()).errors[0].error).toContain("source_url");
  });
});
