// eSIMerge error codes (owner-provided docs). Error format: { error: { code, message, field? }, request_id }.
// Logic uses error.code only; error.message is never stored, logged or shown.

export type EsmErrorInfo = { code: string | null; field: string | null; requestId: string | null; httpStatus: number | null };

export function parseEsmError(httpStatus: number | null, body: unknown): EsmErrorInfo {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const e = (b["error"] && typeof b["error"] === "object" ? b["error"] : {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 120) : null);
  return { code: s(e["code"]), field: s(e["field"]), requestId: s(b["request_id"]), httpStatus };
}

export type OrderOutcome = "failed" | "needs_review" | "in_progress" | "none";
export type PauseReason = "insufficient_funds" | "auth";
export type EsmErrorRule = {
  label: string;
  /** Delays (ms) for in-request retries; empty = never retry. */
  retryDelays: number[];
  /** What happens to an order whose createOrder ended with this error (after retries). */
  order: OrderOutcome;
  pause?: PauseReason;
  planUnavailable?: boolean;
};

const TRANSIENT = [1000, 2000, 4000, 8000];
const TECH: EsmErrorRule = { label: "Technischer Fehler, Support nötig", retryDelays: [], order: "needs_review" };

const RULES: Record<string, EsmErrorRule> = {
  insufficient_funds: { label: "Guthaben bei eSIMerge zu niedrig", retryDelays: [], order: "failed", pause: "insufficient_funds" },
  plan_unavailable: { label: "Tarif bei eSIMerge nicht verfügbar – aus dem Shop genommen", retryDelays: [], order: "failed", planUnavailable: true },
  validation_error: { label: "Programmfehler: Anfrage ungültig", retryDelays: [], order: "failed" },
  idempotency_key_required: TECH,
  idempotency_conflict: TECH,
  request_in_flight: { label: "Anfrage läuft noch bei eSIMerge", retryDelays: [2000, 4000, 8000, 16000], order: "in_progress" },
  missing_api_key: { label: "eSIMerge-Zugang ungültig", retryDelays: [], order: "needs_review", pause: "auth" },
  invalid_api_key: { label: "eSIMerge-Zugang ungültig", retryDelays: [], order: "needs_review", pause: "auth" },
  revoked_api_key: { label: "eSIMerge-Zugang ungültig", retryDelays: [], order: "needs_review", pause: "auth" },
  forbidden: { label: "Schlüssel hat keine Berechtigung", retryDelays: [], order: "needs_review", pause: "auth" },
  not_found: { label: "Bei eSIMerge nicht gefunden – keine Statusänderung", retryDelays: [], order: "none" },
  rate_limited: { label: "Anfragegrenze erreicht – später erneut", retryDelays: TRANSIENT, order: "in_progress" },
  internal_error: { label: "eSIMerge-Störung – Ausgang unklar, bitte prüfen", retryDelays: TRANSIENT, order: "needs_review" },
  upstream_unavailable: { label: "eSIMerge nicht erreichbar – Ausgang unklar, bitte prüfen", retryDelays: TRANSIENT, order: "needs_review" },
  method_not_allowed: { label: "Programmfehler: falsche Methode", retryDelays: [], order: "failed" },
};

/** Rule for an error answer. Falls back to the HTTP status when no code is given; unknown codes = technical error. */
export function errorRule(code: string | null, httpStatus: number | null): EsmErrorRule {
  if (code && RULES[code]) return RULES[code];
  if (code) return TECH;
  switch (httpStatus) {
    case 401: return RULES["invalid_api_key"]!;
    case 403: return RULES["forbidden"]!;
    case 404: return RULES["not_found"]!;
    case 429: return RULES["rate_limited"]!;
    case 500: return RULES["internal_error"]!;
    case 502: case 503: case 504: return RULES["upstream_unavailable"]!;
    default: return TECH;
  }
}

/** In-request retries happen only for 429/500/502/503/504 (and request_in_flight); always with the same idempotency key. */
export function retryDelays(code: string | null, httpStatus: number | null): number[] {
  if (code === "request_in_flight") return RULES["request_in_flight"]!.retryDelays;
  if (httpStatus === 429 || httpStatus === 500 || httpStatus === 502 || httpStatus === 503 || httpStatus === 504) return TRANSIENT;
  return [];
}

/** Text stored/shown for admins: label, code, field, request_id — never the original message. */
export function errorSummary(i: EsmErrorInfo): string {
  const r = errorRule(i.code, i.httpStatus);
  return [r.label, i.code ? `Code: ${i.code}` : i.httpStatus ? `HTTP ${i.httpStatus}` : null, i.field ? `Feld: ${i.field}` : null, i.requestId ? `request_id: ${i.requestId}` : null].filter(Boolean).join(" · ").slice(0, 300);
}

/** API calls per minute we allow ourselves (eSIMerge limit is 60 per key). */
export const ESM_CALLS_PER_MINUTE = 40;
