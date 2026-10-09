// Generic HTTP client for the provider: auth, timeout, retry (GET only),
// a simple circuit breaker and request logging. No provider details here.

import { esimergeConfig, type EndpointDef } from "./config";
import { parseEsmError, errorSummary, retryDelays, ESM_CALLS_PER_MINUTE } from "../../esimerge-errors";
import { ProviderNotConfiguredError, ProviderRequestError, ProviderUnavailableError } from "../types";

const breaker = { failures: 0, openUntil: 0 };
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 30_000;

export function providerEnv() {
  const baseUrl = process.env[esimergeConfig.baseUrlEnv];
  const token = process.env[esimergeConfig.auth.tokenEnv];
  const webhookSecret = process.env[esimergeConfig.webhook.secretEnv];
  return { baseUrl, token, webhookSecret };
}

function authHeaders(token: string): Record<string, string> {
  const { type, headerName } = esimergeConfig.auth;
  switch (type) {
    case "bearer":
      return { Authorization: `Bearer ${token}` };
    case "header":
      if (!headerName) throw new ProviderNotConfiguredError("auth.headerName");
      return { [headerName]: token };
    case "basic":
      return { Authorization: `Basic ${btoa(token)}` };
    case "oauth2":
      // TODO(ESIMERGE): token exchange flow
      throw new ProviderNotConfiguredError("auth.oauth2");
    default:
      throw new ProviderNotConfiguredError("auth.type");
  }
}

async function logCall(endpoint: string, status: number | null, latencyMs: number, error?: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_logs").insert({ provider: "esimerge", endpoint, status, latency_ms: latencyMs, error: error?.slice(0, 500) ?? null });
  } catch {
    // logging must never break a request
  }
}

export type RequestOptions = {
  params?: Record<string, string>; // replaces ':key' in path
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  idempotencyKey?: string | undefined;
  idempotencyHeader?: string | undefined; // TODO(ESIMERGE): header name if supported
};

export async function providerRequest(name: string, def: EndpointDef | null, opts: RequestOptions = {}): Promise<{ status: number; body: unknown; latencyMs: number }> {
  if (!def) throw new ProviderNotConfiguredError(`endpoints.${name}`);
  const { baseUrl, token } = providerEnv();
  if (!baseUrl) throw new ProviderNotConfiguredError(esimergeConfig.baseUrlEnv);
  if (!token) throw new ProviderNotConfiguredError(esimergeConfig.auth.tokenEnv);
  if (Date.now() < breaker.openUntil) throw new ProviderUnavailableError();

  let path = def.path;
  for (const [k, v] of Object.entries(opts.params ?? {})) path = path.replace(`:${k}`, encodeURIComponent(v));
  const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = { Accept: "application/json", ...authHeaders(token) };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey && opts.idempotencyHeader) headers[opts.idempotencyHeader] = opts.idempotencyKey;

  // Retries (owner docs): 429/500/502/503/504 after 1, 2, 4, 8 s; request_in_flight after 2, 4, 8 s.
  // Headers (incl. Idempotency-Key) are built once, so every retry of a POST reuses the SAME key.
  // Network errors/timeouts are retried the same way; if still unclear, the raw error propagates (→ needs_review).
  let lastErr: unknown;
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const started = Date.now();
    let res: Response;
    try {
      res = await fetch(url, {
        method: def.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
        signal: AbortSignal.timeout(esimergeConfig.limits.timeoutMs),
      });
    } catch (e) {
      lastErr = e;
      await logCall(name, null, Date.now() - started, e instanceof Error && e.name === "TimeoutError" ? "timeout" : "network error");
      if (attempt < TRANSIENT_DELAYS.length) { await sleepFn(TRANSIENT_DELAYS[attempt]!); continue; }
      break;
    }
    const latencyMs = Date.now() - started;
    const text = await res.text();
    let body: unknown = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (res.ok) {
      await logCall(name, res.status, latencyMs);
      breaker.failures = 0;
      return { status: res.status, body, latencyMs };
    }
    const info = parseEsmError(res.status, body);
    // Only code, field and request_id are logged — never error.message or the body.
    await logCall(name, res.status, latencyMs, errorSummary(info));
    const err = new ProviderRequestError(`HTTP ${res.status}${info.code ? ` ${info.code}` : ""}`, res.status, name, info);
    const delays = retryDelays(info.code, res.status);
    if (attempt < delays.length) { lastErr = err; await sleepFn(delays[attempt]!); continue; }
    if (res.status >= 500) { breaker.failures++; if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS; }
    else breaker.failures = 0;
    throw err;
  }
  breaker.failures++;
  if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  throw lastErr instanceof Error ? lastErr : new ProviderRequestError("Request failed", undefined, name);
}

const TRANSIENT_DELAYS = [1000, 2000, 4000, 8000];
let sleepFn = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let throttleEnabled = true;
/** Tests only: instant sleeps, no DB throttle. */
export function __setProviderTestMode(sleep: (ms: number) => Promise<void>) { sleepFn = sleep; throttleEnabled = false; breaker.failures = 0; breaker.openUntil = 0; }

/** Shared queue across workers: at most ESM_CALLS_PER_MINUTE calls per minute (eSIMerge allows 60/key). Waits for the next minute when full. */
async function throttle() {
  if (!throttleEnabled) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < 3; i++) {
      const { data: ok, error } = await supabaseAdmin.rpc("rate_limit_hit", { _bucket: "esimerge-api", _window_seconds: 60, _max: ESM_CALLS_PER_MINUTE });
      if (error || ok) return;
      await sleepFn(60_000 - (Date.now() % 60_000) + 50);
    }
  } catch { /* throttle must never block a request */ }
}

/** Constant-time HMAC-SHA256 verification (hex or base64 signature). */
export async function verifyHmacSha256(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const b64 = btoa(String.fromCharCode(...mac));
  const sig = signature.replace(/^sha256=/, "").trim();
  const candidate = sig.length === hex.length ? hex : b64;
  if (sig.length !== candidate.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ candidate.charCodeAt(i);
  return diff === 0;
}
