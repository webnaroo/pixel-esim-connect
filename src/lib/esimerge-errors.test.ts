import { describe, it, expect, vi, beforeEach } from "vitest";

const inserts: { table: string; row: unknown }[] = [];
const upserts: unknown[] = [];
vi.mock("@/integrations/supabase/client.server", () => {
  const q = (table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      insert: (row: unknown) => (inserts.push({ table, row }), Promise.resolve({ error: null })),
      upsert: (row: unknown) => (upserts.push(row), Promise.resolve({ error: null })),
      update: self, select: self, eq: self,
      maybeSingle: () => Promise.resolve({ data: null }),
      single: () => Promise.resolve({ data: null }),
    });
    return b;
  };
  return { supabaseAdmin: { from: q, rpc: () => Promise.resolve({ data: true, error: null }) } };
});

import { errorRule, retryDelays, parseEsmError, errorSummary } from "./esimerge-errors";
import { providerRequest, __setProviderTestMode } from "./providers/esimerge/client.server";
import { fulfillOrder, type FulfillmentStore } from "./fulfillment";
import { ProviderRequestError } from "./providers/types";

const SECRET_MSG = "Reseller balance 0.12 USD left for account 4711";
const errBody = (code: string, extra: Record<string, unknown> = {}) => JSON.stringify({ error: { code, message: SECRET_MSG, ...extra }, request_id: "req_abc" });
const sleeps: number[] = [];

beforeEach(() => {
  inserts.length = 0; upserts.length = 0; sleeps.length = 0;
  process.env["ESIMERGE_BASE_URL"] = "https://portal.esimerge.test/api/public/v1";
  process.env["ESIMERGE_API_KEY"] = "esm_sk_test_x";
  __setProviderTestMode(async (ms) => { sleeps.push(ms); });
});

function mockFetch(responses: { status: number; body: string }[]) {
  const keys: (string | null)[] = [];
  const f = vi.fn(async (_url: unknown, init: RequestInit) => {
    keys.push(new Headers(init.headers).get("Idempotency-Key"));
    const r = responses[Math.min(f.mock.calls.length - 1, responses.length - 1)]!;
    return new Response(r.body, { status: r.status });
  });
  vi.stubGlobal("fetch", f);
  return { f, keys };
}
const post = { method: "POST" as const, path: "/v1/orders" };
const call = () => providerRequest("createOrder", post, { body: { plan_id: "p" }, idempotencyKey: "KEY-1", idempotencyHeader: "Idempotency-Key" });

describe("Zuordnung je Code", () => {
  it.each([
    ["insufficient_funds", 402, "failed", "insufficient_funds"],
    ["plan_unavailable", 422, "failed", undefined],
    ["validation_error", 422, "failed", undefined],
    ["idempotency_key_required", 400, "needs_review", undefined],
    ["idempotency_conflict", 409, "needs_review", undefined],
    ["request_in_flight", 409, "in_progress", undefined],
    ["missing_api_key", 401, "needs_review", "auth"],
    ["invalid_api_key", 401, "needs_review", "auth"],
    ["revoked_api_key", 401, "needs_review", "auth"],
    ["forbidden", 403, "needs_review", "auth"],
    ["not_found", 404, "none", undefined],
    ["rate_limited", 429, "in_progress", undefined],
    ["internal_error", 500, "needs_review", undefined],
    ["upstream_unavailable", 503, "needs_review", undefined],
    ["method_not_allowed", 405, "failed", undefined],
    ["something_new", 418, "needs_review", undefined],
  ])("%s (%i)", (code, status, order, pause) => {
    const r = errorRule(code, status);
    expect(r.order).toBe(order);
    expect(r.pause).toBe(pause);
  });
  it("plan_unavailable nimmt den Tarif raus", () => expect(errorRule("plan_unavailable", 422).planUnavailable).toBe(true));
  it("unbekannter Code = technischer Fehler", () => expect(errorRule("x", 400).label).toBe("Technischer Fehler, Support nötig"));
  it("Wiederholung nur bei 429/500/502/503/504", () => {
    for (const s of [429, 500, 502, 503, 504]) expect(retryDelays(null, s)).toEqual([1000, 2000, 4000, 8000]);
    for (const s of [400, 401, 402, 403, 404, 405, 409, 422]) expect(retryDelays(null, s)).toEqual([]);
    expect(retryDelays("request_in_flight", 409)).toEqual([2000, 4000, 8000]);
  });
  it("Zusammenfassung enthält Code, Feld, request_id, nie die Meldung", () => {
    const s = errorSummary(parseEsmError(422, JSON.parse(errBody("validation_error", { field: "plan_id" }))));
    expect(s).toContain("validation_error"); expect(s).toContain("plan_id"); expect(s).toContain("req_abc");
    expect(s).not.toContain(SECRET_MSG);
  });
});

describe("HTTP-Client", () => {
  it("503 wird 4x wiederholt (1,2,4,8 s) mit demselben Idempotency-Key", async () => {
    const { f, keys } = mockFetch([{ status: 503, body: errBody("upstream_unavailable") }]);
    await expect(call()).rejects.toBeInstanceOf(ProviderRequestError);
    expect(f).toHaveBeenCalledTimes(5);
    expect(sleeps).toEqual([1000, 2000, 4000, 8000]);
    expect(new Set(keys)).toEqual(new Set(["KEY-1"]));
  });
  it("429 dann Erfolg", async () => {
    const { f } = mockFetch([{ status: 429, body: errBody("rate_limited") }, { status: 201, body: "{}" }]);
    await call();
    expect(f).toHaveBeenCalledTimes(2);
  });
  it.each([400, 401, 402, 403, 404, 405, 422])("%i wird nicht wiederholt", async (st) => {
    const { f } = mockFetch([{ status: st, body: errBody("x") }]);
    await expect(call()).rejects.toBeInstanceOf(ProviderRequestError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("request_in_flight: 2,4,8 s, gleicher Schlüssel", async () => {
    const { keys } = mockFetch([{ status: 409, body: errBody("request_in_flight") }]);
    await expect(call()).rejects.toBeInstanceOf(ProviderRequestError);
    expect(sleeps).toEqual([2000, 4000, 8000]);
    expect(new Set(keys)).toEqual(new Set(["KEY-1"]));
  });
  it("Original-Fehlermeldung landet nie im Log", async () => {
    mockFetch([{ status: 402, body: errBody("insufficient_funds") }]);
    await expect(call()).rejects.toBeInstanceOf(ProviderRequestError);
    expect(JSON.stringify(inserts)).not.toContain(SECRET_MSG);
    expect(JSON.stringify(inserts)).toContain("req_abc");
  });
});

describe("Bestellung je Code", () => {
  function store() {
    const s = {
      claim: vi.fn(async () => ({ id: "o1", attempts: 1, idempotencyKey: "KEY-1", providerPlanId: "p1", email: "a@b.c" })),
      markFulfilled: vi.fn(async () => {}), scheduleRetry: vi.fn(async () => {}), markFailed: vi.fn(async () => {}), markNeedsReview: vi.fn(async () => {}),
      providerError: vi.fn(async () => {}),
    };
    return s satisfies FulfillmentStore;
  }
  const failWith = (code: string, status: number) => async () => { throw new ProviderRequestError(`HTTP ${status}`, status, "createOrder", parseEsmError(status, JSON.parse(errBody(code)))); };

  it("insufficient_funds: fulfillment_failed, Pause + Warnung", async () => {
    const s = store();
    expect(await fulfillOrder({ store: s, createOrder: failWith("insufficient_funds", 402) }, "o1")).toBe("failed");
    expect(s.markFailed.mock.calls[0]![1]).toContain("Guthaben bei eSIMerge zu niedrig");
    expect((s.providerError.mock.calls[0] as unknown[])[3]).toMatchObject({ pause: "insufficient_funds" });
  });
  it.each(["invalid_api_key", "forbidden"])("%s pausiert den Verkauf", async (code) => {
    const s = store();
    await fulfillOrder({ store: s, createOrder: failWith(code, code === "forbidden" ? 403 : 401) }, "o1");
    expect((s.providerError.mock.calls[0] as unknown[])[3]).toMatchObject({ pause: "auth" });
    expect(s.markFailed).not.toHaveBeenCalled();
  });
  it("request_in_flight: kein Fehlschlag, später erneut mit demselben Schlüssel", async () => {
    const s = store();
    const create = vi.fn(failWith("request_in_flight", 409));
    expect(await fulfillOrder({ store: s, createOrder: create }, "o1")).toBe("retry_scheduled");
    expect(s.markFailed).not.toHaveBeenCalled();
    expect(create.mock.calls[0]![0]).toMatchObject({ idempotencyKey: "KEY-1" });
  });
  it("internal_error nach Wiederholungen: needs_review", async () => {
    const s = store();
    expect(await fulfillOrder({ store: s, createOrder: failWith("internal_error", 500) }, "o1")).toBe("needs_review");
  });
  it("validation_error: fulfillment_failed mit Feld und request_id, ohne Meldung", async () => {
    const s = store();
    const create = async () => { throw new ProviderRequestError("HTTP 422", 422, "createOrder", parseEsmError(422, JSON.parse(errBody("validation_error", { field: "plan_id" })))); };
    await fulfillOrder({ store: s, createOrder: create }, "o1");
    const msg = s.markFailed.mock.calls[0]![1];
    expect(msg).toContain("plan_id"); expect(msg).toContain("req_abc"); expect(msg).not.toContain(SECRET_MSG);
  });
  it("plan_unavailable: fulfillment_failed, Tarif raus", async () => {
    const s = store();
    expect(await fulfillOrder({ store: s, createOrder: failWith("plan_unavailable", 422) }, "o1")).toBe("failed");
    expect((s.providerError.mock.calls[0] as unknown[])[3]).toMatchObject({ planUnavailable: true });
  });
});
