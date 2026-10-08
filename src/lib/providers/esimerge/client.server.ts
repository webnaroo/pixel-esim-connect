// Generic HTTP client for the provider: auth, timeout, retry (GET only),
// a simple circuit breaker and request logging. No provider details here.

import { esimergeConfig, type EndpointDef } from "./config";
import { sanitize } from "./mapping";
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
  idempotencyKey?: string;
  idempotencyHeader?: string; // TODO(ESIMERGE): header name if supported
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

  // Retries only for idempotent GETs. Never blindly retry createOrder/topUp.
  const maxAttempts = def.method === "GET" ? 3 : 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: def.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(esimergeConfig.limits.timeoutMs),
      });
      const latencyMs = Date.now() - started;
      const text = await res.text();
      let body: unknown = text;
      try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
      await logCall(name, res.status, latencyMs, res.ok ? undefined : JSON.stringify(sanitize(body)));
      if (res.status >= 500 || res.status === 429) {
        lastErr = new ProviderRequestError(`HTTP ${res.status}`, res.status, name);
        continue;
      }
      breaker.failures = 0;
      if (!res.ok) throw new ProviderRequestError(`HTTP ${res.status}`, res.status, name);
      return { status: res.status, body, latencyMs };
    } catch (e) {
      if (e instanceof ProviderRequestError && e.status && e.status < 500 && e.status !== 429) throw e;
      lastErr = e;
      await logCall(name, null, Date.now() - started, e instanceof Error ? e.message : "network error");
    }
  }
  breaker.failures++;
  if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  throw lastErr instanceof Error ? lastErr : new ProviderRequestError("Request failed", undefined, name);
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
