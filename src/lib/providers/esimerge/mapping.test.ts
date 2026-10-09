import { describe, expect, it } from "vitest";
import { buildCreateOrderBody, buildLpaString, hasInstallData, isSandboxKey, mapCatalogItem, mapOrder, mapUsage, nextPage, extractList, sanitize } from "./mapping";
import { missingConfig, esimergeConfig } from "./config";
import { SANDBOX_CATALOG, SANDBOX_ORDER, SANDBOX_USAGE } from "./sandbox.fixtures";
import { maskSensitive } from "@/lib/mask";

// Test data (FIXTURES): real eSIMerge sandbox responses, secrets replaced by placeholders.
const items = extractList(SANDBOX_CATALOG, "listPlans");
const byId = (id: string) => items.find((x) => (x as { id: string }).id === id);

describe("eSIMerge config", () => {
  it("is complete for the sandbox", () => expect(missingConfig()).toEqual([]));
  it("uses the verified Idempotency-Key capability", () => expect(esimergeConfig.capabilities.idempotencyKey).toBe(true));
});

describe("catalog mapping (sandbox fixtures)", () => {
  it("maps all 8 sandbox plans and stops paging", () => {
    expect(items).toHaveLength(8);
    expect(items.filter((i) => mapCatalogItem(i).ok)).toHaveLength(7); // calling plan is skipped for now
    expect(nextPage(SANDBOX_CATALOG)).toBeNull();
  });
  it("country plan: USD cost from price_usd, MB, days, ISO code", () => {
    const r = mapCatalogItem(byId("esm_plan_sa_5gb_30d"));
    expect(r.ok && r.plan).toMatchObject({ type: "data", dataMb: 5120, validityDays: 30, costPrice: 9.99, costCurrency: "USD", coverage: { kind: "country", countries: ["SA"] } });
  });
  it("unlimited plan keeps the provider's fair-use text and no data volume", () => {
    const r = mapCatalogItem(byId("esm_plan_eg_unlim_30d"));
    expect(r.ok && r.plan).toMatchObject({ type: "unlimited", dataMb: null, fairUse: { note: "20GB high-speed then throttled" } });
  });
  it("calling plans are not imported for now (owner decision)", () => {
    const r = mapCatalogItem(byId("esm_plan_us_call_30d"));
    expect(r).toEqual({ ok: false, providerPlanId: "esm_plan_us_call_30d", reason: "Telefonie-Tarif (vorerst nicht importiert)" });
  });
  it("territory codes (GB-SCT) map as own destination kind", () => {
    const base = byId("esm_plan_sa_5gb_30d") as Record<string, unknown>;
    const r = mapCatalogItem({ ...base, country_code: "GB-SCT", destination_name: "Scotland" });
    expect(r.ok && r.plan).toMatchObject({ coverage: { kind: "country", countries: ["GB-SCT"] }, destinationKind: "territory", destinationName: "Scotland" });
  });
  it("alt product codes (CNA) map as hidden alt kind", () => {
    const base = byId("esm_plan_sa_5gb_30d") as Record<string, unknown>;
    const r = mapCatalogItem({ ...base, country_code: "CNA", destination_name: "China Alt" });
    expect(r.ok && r.plan).toMatchObject({ coverage: { kind: "country", countries: ["CNA"] }, destinationKind: "alt" });
  });
  it("multi-island codes arriving as region (AN) map as territory", () => {
    const base = byId("esm_plan_eu_5gb_15d") as Record<string, unknown>;
    const r = mapCatalogItem({ ...base, region_code: "AN", destination_name: "Antilles" });
    expect(r.ok && r.plan).toMatchObject({ coverage: { kind: "region", regionCode: "AN" }, destinationKind: "territory" });
  });
  it("unknown special codes are still rejected with a reason", () => {
    const base = byId("esm_plan_sa_5gb_30d") as Record<string, unknown>;
    const r = mapCatalogItem({ ...base, country_code: "ZZZ" });
    expect(r).toEqual({ ok: false, providerPlanId: "esm_plan_sa_5gb_30d", reason: "Länderkennung fehlt oder ungültig" });
  });
  it("EU plan maps to the region only (no invented country list)", () => {
    const r = mapCatalogItem(byId("esm_plan_eu_5gb_15d"));
    expect(r.ok && r.plan.coverage).toEqual({ kind: "region", countries: [], regionCode: "EU" });
  });
  it("global plan maps to global", () => {
    const r = mapCatalogItem(byId("esm_plan_global_3gb_15d"));
    expect(r.ok && r.plan.coverage.kind).toBe("global");
  });
  it("unmappable entries return a reason instead of being dropped", () => {
    const r = mapCatalogItem({ ...(byId("esm_plan_tr_5gb_15d") as object), currency: "SAR" });
    expect(r).toEqual({ ok: false, providerPlanId: "esm_plan_tr_5gb_15d", reason: "Unbekannte Einkaufswährung SAR" });
    expect(mapCatalogItem({ id: "x" }).ok).toBe(false);
  });
});

describe("order / usage mapping", () => {
  it("maps the created order with installation data", () => {
    const o = mapOrder(SANDBOX_ORDER);
    expect(o.providerOrderId).toMatch(/^esm_order_/);
    expect(o.status).toBe("ready");
    expect(o.esim?.providerEsimId).toMatch(/^esm_esim_/);
    expect(o.esim?.installStatus).toBe("waiting");
    expect(hasInstallData(o.esim)).toBe(true);
  });
  it("order without eSIM data stays pending", () => {
    expect(mapOrder({ ...SANDBOX_ORDER, esim: null }).status).toBe("pending");
  });
  it("maps usage", () => expect(mapUsage(SANDBOX_USAGE)).toEqual({ usedMb: 0, totalMb: 5120 }));
  it("create order body is { plan_id }", () => expect(buildCreateOrderBody({ providerPlanId: "esm_plan_x" })).toEqual({ plan_id: "esm_plan_x" }));
});

describe("secrets", () => {
  it("detects sandbox keys by prefix", () => {
    expect(isSandboxKey("esm_sk_test_abc")).toBe(true);
    expect(isSandboxKey("esm_sk_live_abc")).toBe(false);
    expect(isSandboxKey(undefined)).toBe(false);
  });
  it("masks activation data, install links and eSIMerge keys", () => {
    const masked = JSON.stringify(maskSensitive(SANDBOX_ORDER));
    expect(masked).not.toContain("FIXTURE-CODE");
    expect(masked).not.toContain("smdp.fixture.invalid");
    expect(JSON.stringify(maskSensitive({ note: "key esm_sk_test_123abc" }))).not.toContain("esm_sk_test_123abc");
  });
  it("builds a standard LPA string", () => expect(buildLpaString("smdp.example", "ABC")).toBe("LPA:1$smdp.example$ABC"));
  it("sanitize masks nested keys", () => {
    expect(sanitize({ activation_code: "X", nested: { apiKey: "k", name: "ok" } })).toEqual({ activation_code: "***", nested: { apiKey: "***", name: "ok" } });
  });
});

describe("live catalog: supports_topup null", () => {
  it("maps the plan as not top-upable", () => {
    const base = byId("esm_plan_sa_5gb_30d") as Record<string, unknown>;
    const r = mapCatalogItem({ ...base, supports_topup: null });
    expect(r.ok).toBe(true);
    expect(r.ok && r.plan).toMatchObject({ topUpable: false });
  });
});
