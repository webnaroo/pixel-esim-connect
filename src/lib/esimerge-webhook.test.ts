import { describe, expect, it, vi } from "vitest";
import { hmacSha256Hex } from "./public-route-guard.server";
import { handleEvent, parseEvent, receiveEvent, sanitizePayload, verifyEsimergeSignature, type EventStore, type LocalOrder, type WebhookDeps } from "./esimerge-webhook";

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
function deps(o: LocalOrder | null, api: { status: "pending" | "ready"; providerStatus?: string; failed?: boolean }, pct: number | null = null) {
  const d = {
    findOrder: vi.fn(async () => o), getOrder: vi.fn(async () => api), getUsagePercent: vi.fn(async () => pct),
    markIssued: vi.fn(async () => {}), markFailed: vi.fn(async () => {}), setEsim: vi.fn(async () => {}), sendUsageMail: vi.fn(async () => {}), now: () => new Date(0),
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
  it("order.failed -> fulfillment_failed with code", async () => {
    const d = deps(order(), { status: "pending", failed: true });
    const e = parseEvent(JSON.parse(body), null)!;
    expect((await handleEvent(d, e, "sandbox")).status).toBe("processed");
    expect(d.markFailed).toHaveBeenCalledWith("o1", "insufficient_balance", "zu wenig Guthaben");
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
