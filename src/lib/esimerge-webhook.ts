// eSIMerge webhooks (owner-provided docs): header X-eSimerge-Signature "t=<unix>,v1=<hex>",
// HMAC-SHA256 over "<t>.<raw body>", rejected when older than 5 minutes.
// Payload is never trusted alone: every status change is confirmed by an eSIMerge API read first.
import { hmacSha256Hex, timingSafeEqual } from "./public-route-guard.server";
import { maskSensitive } from "./mask";

export const SIGNATURE_TOLERANCE_SEC = 300;
export const KNOWN_EVENTS = ["order.issued", "order.failed", "esim.activated", "esim.expired", "esim.usage.threshold", "order.topup.completed", "order.topup.failed"] as const;
export type EventType = (typeof KNOWN_EVENTS)[number];
export type Mode = "sandbox" | "live";

export async function verifyEsimergeSignature(header: string | null, rawBody: string, secret: string, nowSec: number): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const tRaw = parts.find(([k]) => k === "t")?.[1];
  const t = Number(tRaw);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => (v ?? "").toLowerCase()).filter(Boolean);
  if (!tRaw || !Number.isInteger(t) || !sigs.length) return false;
  if (Math.abs(nowSec - t) > SIGNATURE_TOLERANCE_SEC) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => timingSafeEqual(s, expected));
}

export type ParsedEvent = {
  eventId: string;
  type: string;
  known: boolean;
  mode: Mode | null; // from payload when present
  refs: { orderId?: string; esimId?: string; iccid?: string };
  threshold?: number;
  code?: string;
  reason?: string;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : undefined);

// TODO(ESIMERGE): field names below follow the common envelope {id,type,data:{...}}; confirm against a real delivery.
export function parseEvent(raw: unknown, deliveryId: string | null): ParsedEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const d = (r["data"] && typeof r["data"] === "object" ? r["data"] : {}) as Record<string, unknown>;
  const eventId = str(r["id"]) ?? str(r["event_id"]) ?? deliveryId ?? undefined;
  const type = str(r["type"]) ?? str(r["event"]);
  if (!eventId || !type) return null;
  const live = r["livemode"] ?? d["livemode"];
  const modeStr = str(r["mode"]) ?? str(d["mode"]);
  const mode: Mode | null = typeof live === "boolean" ? (live ? "live" : "sandbox") : modeStr === "live" || modeStr === "sandbox" ? modeStr : null;
  const th = Number(d["threshold"] ?? d["percent"] ?? d["threshold_percent"]);
  return {
    eventId,
    type,
    known: (KNOWN_EVENTS as readonly string[]).includes(type),
    mode,
    refs: { orderId: str(d["order_id"]) ?? str(d["esm_order_id"]), esimId: str(d["esim_id"]) ?? str(d["esm_esim_id"]), iccid: str(d["iccid"]) },
    ...(Number.isFinite(th) && th > 0 ? { threshold: th } : {}),
    ...(str(d["code"]) ? { code: str(d["code"]) } : {}),
    ...(str(d["reason"]) ?? str(d["message"]) ? { reason: str(d["reason"]) ?? str(d["message"]) } : {}),
  };
}

/** Removes activation codes, LPA, QR, ICCID etc. before anything is stored or logged. */
export const sanitizePayload = (raw: unknown) => maskSensitive(raw);

export type LocalOrder = { id: string; status: string; isSandbox: boolean; providerOrderId: string | null; providerEsimId: string | null; hasInstallData: boolean; alertsSent: number[] };
export type ApiOrder = { status: "pending" | "ready"; providerStatus?: string; failed?: boolean; esim?: unknown };

export type WebhookDeps = {
  findOrder(refs: ParsedEvent["refs"]): Promise<LocalOrder | null>;
  getOrder(providerOrderId: string): Promise<ApiOrder>;
  getUsagePercent(providerEsimId: string): Promise<number | null>;
  markIssued(orderId: string, apiOrder: ApiOrder): Promise<void>;
  markFailed(orderId: string, code: string | undefined, reason: string | undefined): Promise<void>;
  setEsim(orderId: string, patch: { status?: string; activated_at?: string; usage_threshold?: number; usage_alerts_sent?: number[] }): Promise<void>;
  sendUsageMail(orderId: string, threshold: number): Promise<void>;
  now(): Date;
};

export type Outcome = { status: "processed" | "ignored" | "failed"; orderId?: string; error?: string };

export async function handleEvent(deps: WebhookDeps, ev: ParsedEvent, mode: Mode): Promise<Outcome> {
  if (!ev.known) return { status: "ignored", error: "unknown_event_type" };
  if (ev.type.startsWith("order.topup.")) return { status: "processed", ...(ev.type === "order.topup.failed" ? { error: `Top-up fehlgeschlagen: ${ev.code ?? "?"} ${ev.reason ?? ""}`.trim() } : {}) };
  const order = await deps.findOrder(ev.refs);
  if (!order) return { status: "ignored", error: "order_not_found" };
  if (order.isSandbox !== (mode === "sandbox")) return { status: "ignored", orderId: order.id, error: "mode_mismatch" };
  if (!order.providerOrderId) return { status: "ignored", orderId: order.id, error: "no_provider_order" };
  const api = await deps.getOrder(order.providerOrderId);
  const ps = (api.providerStatus ?? "").toLowerCase();
  const notConfirmed = { status: "ignored" as const, orderId: order.id, error: "not_confirmed_by_api" };

  switch (ev.type as EventType) {
    case "order.issued":
      if (api.status !== "ready") return notConfirmed;
      if (order.status !== "fulfilled" || !order.hasInstallData) await deps.markIssued(order.id, api);
      return { status: "processed", orderId: order.id };
    case "order.failed":
      if (order.status === "fulfilled") return { status: "ignored", orderId: order.id, error: "already_fulfilled" };
      if (!(api.failed || ps === "failed")) return notConfirmed;
      await deps.markFailed(order.id, ev.code, ev.reason);
      return { status: "processed", orderId: order.id };
    case "esim.activated":
      if (!["active", "activated", "enabled", "in_use"].includes(ps)) return notConfirmed;
      await deps.setEsim(order.id, { status: "active", activated_at: deps.now().toISOString() });
      return { status: "processed", orderId: order.id };
    case "esim.expired":
      if (ps !== "expired") return notConfirmed;
      await deps.setEsim(order.id, { status: "expired" });
      return { status: "processed", orderId: order.id };
    case "esim.usage.threshold": {
      const th = ev.threshold;
      if (!th || ![50, 80, 100].includes(th) || !order.providerEsimId) return { status: "ignored", orderId: order.id, error: "invalid_threshold" };
      const pct = await deps.getUsagePercent(order.providerEsimId);
      if (pct === null || pct < th) return notConfirmed;
      const mail = th >= 80 && !order.alertsSent.includes(th);
      await deps.setEsim(order.id, { usage_threshold: th, ...(mail ? { usage_alerts_sent: [...order.alertsSent, th] } : {}) });
      if (mail) await deps.sendUsageMail(order.id, th);
      return { status: "processed", orderId: order.id };
    }
  }
  return { status: "ignored" };
}

export type EventStore = {
  /** Inserts the event; false if event_id already exists. */
  insert(row: { eventId: string; deliveryId: string | null; type: string; payload: unknown; mode: Mode }): Promise<boolean>;
  finish(eventId: string, o: Outcome): Promise<void>;
};

/** Stores once, then processes. Duplicates are acknowledged and never processed again. */
export async function receiveEvent(store: EventStore, deps: WebhookDeps, ev: ParsedEvent, raw: unknown, deliveryId: string | null, mode: Mode, background: (p: Promise<void>) => void): Promise<"accepted" | "duplicate"> {
  const inserted = await store.insert({ eventId: ev.eventId, deliveryId, type: ev.type, payload: sanitizePayload(raw), mode });
  if (!inserted) return "duplicate";
  background(processStored(store, deps, ev, mode));
  return "accepted";
}

export async function processStored(store: EventStore, deps: WebhookDeps, ev: ParsedEvent, mode: Mode) {
  let o: Outcome;
  try { o = await handleEvent(deps, ev, mode); }
  catch (e) { o = { status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "error" }; }
  await store.finish(ev.eventId, o);
}
