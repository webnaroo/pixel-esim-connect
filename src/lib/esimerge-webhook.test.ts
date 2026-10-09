import { mapOrder, buildCreateOrderBody } from "./providers/esimerge/mapping";
import { buildCustomerReference, costDeviation, errorCodeLabel } from "./esimerge-order";
import { webhookReasonLabel } from "./webhook-labels";
import { describe, expect, it, vi } from "vitest";
import { hmacSha256Hex } from "./public-route-guard.server";
import { handleEvent, parseEvent, receiveEvent, sanitizePayload, verifyEsimergeSignature, type EventStore, type ApiOrder, type LocalOrder, type WebhookDeps } from "./esimerge-webhook";

const SECRET = "whsec_test_123";
const now = 1_800_000_000;
const sign = async (body: string, t = now) => `t=${t},v1=${await hmacSha256Hex(SECRET, `${t}.${body}`)}`;
const body = JSON.stringify({ id: "evt_1", type: "order.failed", data: { order_id: "esm_o1", code: "insufficient_balance", reason: "zu wenig Guthaben" } });

describe("signature", () => {
  it("accepts valid", async () => expect(await verifyEsimergeSignature(await sign(body), body, SECRET, now)).toBe(true));
  it("rejects missing", async () => expect(await verifyEsimergeSignature(null, body, SECRET, now)).toBe(false));
  it("rejects wrong", async () => expect(await verifyEsimergeSignature(`t=${now},v1=${"0".repeat(64)}`, body, SECRET, now)).toBe(false));
  it("rejects altered body", async () => expect(await verifyEsimergeSignature(await sign(body), body + " ", SECRET, now)).toBe(false));
  it("rejects older than 5 min", async () => expect(await verifyEsimergeSignature(await sign(body, now - 301), body, SECRET, now)).toBe(false));
  it("rejects missing t", async () => expect(await verifyEsimergeSignature((await sign(body)).replace(/^t=\d+,/, ""), body, SECRET, now)).toBe(false));
});

const order = (o: Partial<LocalOrder> = {}): LocalOrder => ({ id: "o1", status: "fulfilling", isSandbox: true, providerOrderId: "esm_o1", providerEsimId: "esm_e1", hasInstallData: false, alertsSent: [], ...o });
function deps(o: LocalOrder | null, api: ApiOrder, pct: number | null = null) {
  const d = {
    findOrder: vi.fn(async () => o), getOrder: vi.fn(async () => api), getUsagePercent: vi.fn(async () => pct),
    markIssued: vi.fn(async () => {}), markFailed: vi.fn(async () => {}), markCancelled: vi.fn(async () => {}), setEsim: vi.fn(async () => {}), sendUsageMail: vi.fn(async () => {}), now: () => new Date(0),
  };
  return d satisfies WebhookDeps;
}
const ev = (type: string, data: Record<string, unknown> = { order_id: "esm_o1" }) => parseEvent({ id: "e" + type, type, data }, null)!;

describe("processing", () => {
  it("duplicate event processed once", async () => {
    const seen = new Set<string>();
    const store: EventStore = { insert: async (r) => (seen.has(r.eventId) ? false : (seen.add(r.eventId), true)), finish: async () => {} };
    const d = deps(order(), { status: "pending", failed: true });
    const e = ev("order.failed");
    const runs: Promise<void>[] = [];
    expect(await receiveEvent(store, d, e, {}, null, "sandbox", (p) => runs.push(p))).toBe("accepted");
    expect(await receiveEvent(store, d, e, {}, null, "sandbox", (p) => runs.push(p))).toBe("duplicate");
    await Promise.all(runs);
    expect(d.markFailed).toHaveBeenCalledTimes(1);
  });
  it("unknown type -> ignored", async () => expect((await handleEvent(deps(order(), { status: "ready" }), ev("foo.bar"), "sandbox")).status).toBe("ignored"));
  it("no API confirmation -> no status change", async () => {
    const d = deps(order(), { status: "pending" });
    expect((await handleEvent(d, ev("order.issued"), "sandbox")).error).toBe("not_confirmed_by_api");
    expect((await handleEvent(d, ev("esim.activated"), "sandbox")).error).toBe("not_confirmed_by_api");
    expect(d.markIssued).not.toHaveBeenCalled();
    expect(d.setEsim).not.toHaveBeenCalled();
  });
  it("order.failed -> fulfillment_failed with code from API (not payload)", async () => {
    const d = deps(order(), { status: "pending", orderStatus: "failed", errorCode: "insufficient_balance" });
    const o = await handleEvent(d, ev("order.failed", { order_id: "esm_o1", code: "from_payload" }), "sandbox");
    expect(o.status).toBe("processed");
    expect(d.markFailed).toHaveBeenCalledWith("o1", "insufficient_balance");
    expect(errorCodeLabel("insufficient_balance")).toBe("Guthaben bei eSIMerge aufladen");
  });
  it("order.failed on delivered order is ignored", async () => {
    const d = deps(order({ status: "fulfilled" }), { status: "pending", failed: true });
    await handleEvent(d, ev("order.failed"), "sandbox");
    expect(d.markFailed).not.toHaveBeenCalled();
  });
  it("sandbox event never touches live order", async () => {
    const d = deps(order({ isSandbox: false }), { status: "ready" });
    expect((await handleEvent(d, ev("order.issued"), "sandbox")).error).toBe("mode_mismatch");
    expect(d.getOrder).not.toHaveBeenCalled();
  });
  it("live event never touches sandbox order", async () => {
    const d = deps(order({ isSandbox: true }), { status: "ready" });
    expect((await handleEvent(d, ev("order.issued"), "live")).error).toBe("mode_mismatch");
    expect(d.markIssued).not.toHaveBeenCalled();
  });
  it("payload mode contradicting the verifying secret is stored as ignored", async () => {
    const d = deps(order({ isSandbox: false }), { status: "ready" });
    const e = { ...ev("order.issued"), modeConflict: true };
    expect(await handleEvent(d, e, "live")).toEqual({ status: "ignored", error: "mode_conflict" });
    expect(d.findOrder).not.toHaveBeenCalled();
  });
  it("live secret verifies live webhook, sandbox secret does not", async () => {
    const LIVE = "whsec_live_456";
    const h = `t=${now},v1=${await hmacSha256Hex(LIVE, `${now}.${body}`)}`;
    expect(await verifyEsimergeSignature(h, body, LIVE, now)).toBe(true);
    expect(await verifyEsimergeSignature(h, body, SECRET, now)).toBe(false);
  });
  it("usage threshold 80 mails once", async () => {
    const d = deps(order({ alertsSent: [80] }), { status: "ready" }, 85);
    await handleEvent(d, ev("esim.usage.threshold", { order_id: "esm_o1", threshold: 80 }), "sandbox");
    expect(d.sendUsageMail).not.toHaveBeenCalled();
    const d2 = deps(order(), { status: "ready" }, 85);
    await handleEvent(d2, ev("esim.usage.threshold", { order_id: "esm_o1", threshold: 80 }), "sandbox");
    expect(d2.sendUsageMail).toHaveBeenCalledTimes(1);
  });
  it("no codes in stored payload", () => {
    const s = JSON.stringify(sanitizePayload({ data: { activation_code: "LPA-SECRET-1", lpa_string: "LPA:1$x$SECRET2", iccid: "8901" } }));
    expect(s).not.toContain("SECRET");
    expect(s).not.toContain("8901");
  });
});

describe("test deliveries", () => {
  it("gültig signierte Testnachricht ohne passende Bestellung erscheint als ignoriert mit Grund", async () => {
    const { webhookReasonLabel, webhookDeliveryVerified } = await import("./webhook-labels");
    const secret = "whsec_test_123";
    const t = 1_791_550_881;
    const body = JSON.stringify({ id: "evt_test_abc", type: "order.issued", mode: "test", test: true, data: { order_id: "esm_order_test_demo", iccid: "8988" } });
    const { hmacSha256Hex } = await import("./public-route-guard.server");
    const header = `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${body}`)}`;
    expect(await verifyEsimergeSignature(header, body, secret, t)).toBe(true);
    const stored: { eventId: string; status?: string; error?: string; payload?: unknown }[] = [];
    const store: EventStore = {
      insert: async (r) => (stored.push({ eventId: r.eventId, payload: r.payload }), true),
      finish: async (id, o) => { const row = stored.find((s) => s.eventId === id)!; row.status = o.status; if (o.error) row.error = o.error; },
    };
    const d = deps(null, { status: "ready" });
    const raw = JSON.parse(body);
    const runs: Promise<void>[] = [];
    await receiveEvent(store, d, parseEvent(raw, null)!, raw, null, "sandbox", (p) => runs.push(p));
    await Promise.all(runs);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.status).toBe("ignored");
    expect(webhookReasonLabel(stored[0]!.error)).toBe("Testnachricht");
    expect(JSON.stringify(stored[0]!.payload)).not.toContain("8988");
    expect(d.markIssued).not.toHaveBeenCalled();
    expect(webhookDeliveryVerified([{ signature_valid: true, status: stored[0]!.status! }])).toBe(true);
  });
  it("echte Nachricht ohne passende Bestellung: ignoriert, Bestellung nicht gefunden", async () => {
    const { webhookReasonLabel } = await import("./webhook-labels");
    const o = await handleEvent(deps(null, { status: "ready" }), ev("order.issued"), "sandbox");
    expect(o.status).toBe("ignored");
    expect(webhookReasonLabel(o.error)).toBe("Bestellung nicht gefunden");
  });
  it("ungültige Unterschrift zählt nicht als eingerichtet", async () => {
    const { webhookDeliveryVerified } = await import("./webhook-labels");
    expect(webhookDeliveryVerified([{ signature_valid: false, status: "ignored" }])).toBe(false);
    expect(webhookDeliveryVerified([{ signature_valid: true, status: "failed" }])).toBe(false);
  });
});

describe("eSIMerge Bestell-Abruf", () => {
  const base = { id: "esm_o1", object: "order", amount_usd: 4.5, esim: { id: "esm_e1", status: "pending", qr_code: "LPA:1$smdp.x$CODE", smdp_address: "smdp.x", activation_code: "CODE", iccid: "8900" } };
  it.each([["pending", "pending"], ["issued", "issued"], ["active", "active"], ["expired", "expired"], ["cancelled", "cancelled"], ["failed", "failed"], ["weird", "unknown"]])("Status %s -> %s", (raw, want) => {
    expect(mapOrder({ ...base, status: raw }).orderStatus).toBe(want);
  });
  it("failed liefert error.code, aber nie error.message", () => {
    const r = mapOrder({ ...base, status: "failed", esim: null, error: { code: "insufficient_balance", message: "Reseller XY balance 0.12" } });
    expect(r.errorCode).toBe("insufficient_balance");
    expect(JSON.stringify(r)).not.toContain("Reseller XY");
  });
  it("order.failed ohne Bestätigung ändert nichts", async () => {
    const d = deps(order(), { status: "pending", orderStatus: "pending" });
    const o = await handleEvent(d, ev("order.failed"), "sandbox");
    expect(o).toMatchObject({ status: "ignored", error: "not_confirmed_by_api" });
    expect(webhookReasonLabel(o.error)).toBe("Status nicht bestätigt");
    expect(d.markFailed).not.toHaveBeenCalled();
  });
  it("API cancelled -> storniert, Erstatten prüfen", async () => {
    const d = deps(order(), { status: "pending", orderStatus: "cancelled" });
    expect((await handleEvent(d, ev("esim.activated"), "sandbox")).status).toBe("processed");
    expect(d.markCancelled).toHaveBeenCalledWith("o1");
  });
  it("esim.activated übernimmt activated_at aus der API", async () => {
    const d = deps(order(), { status: "ready", orderStatus: "active", activatedAt: "2026-10-09T10:00:00Z" });
    await handleEvent(d, ev("esim.activated"), "sandbox");
    expect(d.setEsim).toHaveBeenCalledWith("o1", { status: "active", activated_at: "2026-10-09T10:00:00Z" });
  });
  it("customer_reference enthält keine personenbezogenen Daten", () => {
    const ref = buildCustomerReference("6f1c2b9e-1111-4222-8333-944445555666");
    expect(ref).toBe("6f1c2b9e-1111-4222-8333-944445555666");
    expect(buildCustomerReference("max@example.com Max Muster")).not.toMatch(/@|\s/);
    expect(buildCustomerReference("x".repeat(200))).toHaveLength(120);
    expect(buildCreateOrderBody({ providerPlanId: "p1", customerReference: "abc" })).toEqual({ plan_id: "p1", customer_reference: "abc" });
  });
  it("Preisabweichung erzeugt Warnung", () => {
    expect(costDeviation(5.1, 4.5)).toBe("Einkaufspreis weicht vom Katalog ab: 5,10 statt 4,50 USD");
    expect(costDeviation(4.5, 4.5)).toBeNull();
  });
  it("LPA, Aktivierungscode und qr_code nie in der Webhook-Tabelle", () => {
    const s = JSON.stringify(sanitizePayload({ id: "e", type: "order.issued", data: { ...base, lpa: "LPA:1$smdp.x$CODE", qr_code: "LPA:1$smdp.x$CODE", activation_code: "CODE" } }));
    expect(s).not.toContain("CODE");
    expect(s).not.toContain("LPA:1$");
  });
});
