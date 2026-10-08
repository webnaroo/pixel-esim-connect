import { describe, expect, it } from "vitest";
import { buildLpaString, mapPlan, MAPPING_READY, sanitize } from "./mapping";
import { missingConfig } from "./config";
import { ProviderNotConfiguredError } from "../types";

describe("eSIMerge mapping (not yet configured)", () => {
  it("throws ProviderNotConfiguredError instead of inventing plans", () => {
    if (MAPPING_READY) return;
    expect(() => mapPlan({})).toThrow(ProviderNotConfiguredError);
  });
  it("reports missing config while endpoints are empty", () => {
    expect(missingConfig()).toContain("endpoints.createOrder");
  });
  it("builds a standard LPA string", () => {
    expect(buildLpaString("smdp.example", "ABC")).toBe("LPA:1$smdp.example$ABC");
  });
  it("masks activation codes and tokens in raw samples", () => {
    expect(sanitize({ activation_code: "X", nested: { apiKey: "k", name: "ok" } })).toEqual({
      activation_code: "***",
      nested: { apiKey: "***", name: "ok" },
    });
  });
});
