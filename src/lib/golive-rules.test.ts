import { describe, expect, it } from "vitest";
import { buildPriceCheck, receiptGaps, stripeLiveMissing, stripeMode, webhookModeFromSecret, type CheckPlan } from "./golive-rules";
import { shopChecklistMissing, type ShopChecklist } from "./admin-rules";

const rule = { id: "g", scope: "global", scope_ref: null, type: "percent", value: 50, rounding: "none", priority: 0 };
const fx = (from: string) => (from === "USD" ? 0.9 : null);
const plan = (o: Partial<CheckPlan>): CheckPlan => ({ id: "p1", providerPlanId: "esm1", type: "data", dataMb: 1024, validityDays: 7, costPrice: 10, costCurrency: "USD", destinationId: "d", destinationSlug: "turkey", destinationName: "Türkei", iso: "TR", isActive: true, released: true, ...o });
const base = { rules: [rule], fx, vat: 0.19, fees: { percent: 2.9, fixed: 0.3 }, lastPaid: {}, unmapped: [], newIds: [], goneIds: [] };

describe("webhook mode by secret", () => {
  it("sandbox secret marks the event sandbox", () => expect(webhookModeFromSecret("sandbox", null)).toEqual({ mode: "sandbox", conflict: false }));
  it("live secret with payload mode sandbox is a conflict", () => expect(webhookModeFromSecret("live", "sandbox").conflict).toBe(true));
});

describe("stripe live gate", () => {
  it("test key only shows Stripe: Test", () => expect(stripeMode({ liveKey: false, liveSecret: false, liveEventsProcessed: 0 })).toBe("test"));
  it("needs a processed live event", () => expect(stripeLiveMissing({ liveKey: true, liveSecret: true, liveEventsProcessed: 0 })).toEqual(["Stripe Live-Event empfangen"]));
  it("live key + secret + event is complete", () => expect(stripeLiveMissing({ liveKey: true, liveSecret: true, liveEventsProcessed: 1 })).toEqual([]));
});

describe("shop checklist go-live items", () => {
  const green: ShopChecklist = { providerReachable: true, providerSandbox: false, catalogCount: 3, stripeConfigured: true, emailVerified: true, emailTestSent: true, replyConfirmed: true, fxValid: true, webhookReady: true, legalPublished: true, providerAuthOk: true };
  it("all green opens nothing missing", () => expect(shopChecklistMissing(green)).toEqual([]));
  it("missing test email blocks", () => expect(shopChecklistMissing({ ...green, emailTestSent: false })).toContain("Test-E-Mail gesendet"));
  it("unconfirmed reply address blocks", () => expect(shopChecklistMissing({ ...green, replyConfirmed: false })).toContain("Antwortadresse support@globesim.de bestätigt"));
  it("unverified domain blocks", () => expect(shopChecklistMissing({ ...green, emailVerified: false }).length).toBe(1));
});

describe("price check", () => {
  it("10 USD at 0.90 with 50 % margin: rest after 2.9 % + 0.30 fee", () => {
    const r = buildPriceCheck({ ...base, plans: [plan({})] }).rows[0]!;
    expect(r.costEur).toBe(9);
    expect(r.gross).toBe(16.06);
    expect(r.net).toBe(13.5);
    expect(r.fee).toBe(0.77);
    expect(r.rest).toBe(3.73);
  });
  it("no warning for low rest after fee", () => {
    const r = buildPriceCheck({ ...base, rules: [{ ...rule, value: 5 }], plans: [plan({})] });
    expect(r.lists).not.toHaveProperty("lowRest");
  });
  it("lists plans without cost, without rule and with paid deviation", () => {
    const r = buildPriceCheck({ ...base, rules: [], lastPaid: { esm1: 10.5 }, plans: [plan({}), plan({ id: "p2", providerPlanId: "esm2", costPrice: null })] });
    expect(r.lists.noCost).toEqual(["p2"]);
    expect(r.lists.noMargin).toEqual(["p1"]);
    expect(r.lists.deviation).toEqual([{ id: "p1", catalog: 10, paid: 10.5 }]);
  });
  it("unreleased plans count as new", () => expect(buildPriceCheck({ ...base, plans: [plan({ released: false })] }).lists.newPlans).toEqual(["p1"]));
  it("sample shows cheapest and biggest per country", () => {
    const r = buildPriceCheck({ ...base, plans: [plan({}), plan({ id: "p2", providerPlanId: "esm2", costPrice: 30, dataMb: 20480 })] });
    const tr = r.samples.filter((s) => s.iso === "TR");
    expect(tr.map((s) => s.row?.id)).toEqual(["p1", "p2"]);
    expect(r.samples.find((s) => s.iso === "US")?.kind).toBe("none");
  });
});

describe("receipt gaps", () => {
  it("names missing company fields", () => expect(receiptGaps({ company_name: "GlobeSIM", street: "Karlstal 27a", zip: "24143", city: "Kiel" })).toEqual(["USt-IdNr."]));
});

import { canSwitchShopOn, evaluateStep, tickStep, SHOP_CONFIRM_PHRASE, type WizardFacts } from "./golive-wizard";
const facts = (o: Partial<WizardFacts> = {}): WizardFacts => ({
  key: { set: true, sandbox: false, pingOk: true, pingMessage: "ok" },
  webhook: { liveSecretSet: true, liveValidEvents: 1, recent401: 0, sandboxEndpointRemovedConfirmed: true },
  catalog: { lastSyncOk: true, lastSyncAt: null, activePlans: 5, countries: 3, unpriced: 0, noMargin: 0 },
  stripe: { liveKey: true, liveSecret: true, liveEvents: 1, dashboardConfirmed: true },
  email: { authTemplates: true, testOk: true, replyConfirmed: true },
  purchase: { orderId: "o", paid: true, issuedWebhook: true, installData: true, emailSent: true, costMatches: true, refunded: true },
  autoRefund: { decided: true, enabled: false }, shop: { missing: [], enabled: false }, ...o,
});
describe("go-live assistant", () => {
  it("rejects a sandbox key", () => {
    const r = evaluateStep(1, facts({ key: { set: true, sandbox: true, pingOk: true, pingMessage: "" } }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Sandbox-Schlüssel");
  });
  it("ticks a step only when green", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const red = evaluateStep(2, facts({ webhook: { liveSecretSet: true, liveValidEvents: 0, recent401: 2, sandboxEndpointRemovedConfirmed: true } }));
    expect(tickStep({}, 2, red, now)).toEqual({});
    expect(red.reason).toContain("401");
    expect(tickStep({}, 2, evaluateStep(2, facts()), now)).toEqual({ "2": now.toISOString() });
  });
  it("shop stays locked without explicit confirmation", () => {
    expect(canSwitchShopOn([], undefined)).toBe(false);
    expect(canSwitchShopOn([], "ja")).toBe(false);
    expect(canSwitchShopOn(["Test-E-Mail gesendet"], SHOP_CONFIRM_PHRASE)).toBe(false);
    expect(canSwitchShopOn([], SHOP_CONFIRM_PHRASE)).toBe(true);
  });
  it("step results never contain secret values", () => {
    const secret = "esm_sk_live_SUPERSECRET";
    const text = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => evaluateStep(n, facts({ key: { set: true, sandbox: false, pingOk: false, pingMessage: "401 unauthorized" } }))));
    expect(text).not.toContain(secret);
    expect(text).not.toMatch(/esm_sk_live_[A-Za-z0-9]/);
  });
});
