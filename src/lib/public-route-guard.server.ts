// Mandatory guard for every server route under src/routes/api/public/*.
// Each handler must call guardPublicRoute() first: it rate-limits by caller IP
// and verifies either an HMAC signature over the raw body or a shared secret token.

export type GuardOptions = {
  name: string; // bucket prefix, e.g. "stripe-webhook"
  secretEnv?: string; // env var holding the secret; missing => 503, never bypassed
  /** Several candidate secrets (e.g. sandbox + live); the first that verifies wins and is returned as `matched`. */
  secretEnvs?: { env: string; tag: string }[];
  secretDb?: string; // or: name in public.internal_secrets (server-only table), used by scheduled jobs
  auth: { kind: "hmac-sha256"; header: string; prefix?: string } | { kind: "bearer" } | { kind: "stripe"; toleranceSeconds?: number } | { kind: "esimerge" } | { kind: "standard-webhooks"; toleranceSeconds?: number };
  limit?: { windowSeconds: number; max: number };
};

export type GuardResult = { ok: true; rawBody: string; matched?: string } | { ok: false; response: Response };

const enc = new TextEncoder();

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAuth(opts: GuardOptions["auth"], secret: string, headers: Headers, rawBody: string): Promise<boolean> {
  if (opts.kind === "bearer") {
    const h = headers.get("authorization") ?? "";
    return h.startsWith("Bearer ") && timingSafeEqual(h.slice(7), secret);
  }
  if (opts.kind === "stripe") return verifyStripeSignature(headers.get("stripe-signature") ?? "", rawBody, secret, Math.floor(Date.now() / 1000), opts.toleranceSeconds);
  if (opts.kind === "standard-webhooks") return verifyStandardWebhook(headers, rawBody, secret, Math.floor(Date.now() / 1000), opts.toleranceSeconds);
  if (opts.kind === "esimerge") {
    const { verifyEsimergeSignature } = await import("./esimerge-webhook");
    return verifyEsimergeSignature(headers.get("x-esimerge-signature"), rawBody, secret, Math.floor(Date.now() / 1000));
  }
  let given = headers.get(opts.header) ?? "";
  if (opts.prefix) {
    if (!given.startsWith(opts.prefix)) return false;
    given = given.slice(opts.prefix.length);
  }
  return given.length > 0 && timingSafeEqual(given.toLowerCase(), await hmacSha256Hex(secret, rawBody));
}

/** Stripe scheme: header "t=<unix>,v1=<hex hmac of `${t}.${body}`>", rejected outside the tolerance window. */
export async function verifyStripeSignature(header: string, rawBody: string, secret: string, nowSec: number, toleranceSeconds = 300): Promise<boolean> {
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => (v ?? "").toLowerCase());
  if (!Number.isInteger(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSeconds) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => timingSafeEqual(s, expected));
}

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/**
 * Standard Webhooks scheme (used by Supabase auth hooks): headers webhook-id, webhook-timestamp and
 * webhook-signature ("v1,<base64 hmac of `${id}.${timestamp}.${body}`>", several signatures space-separated).
 * The secret is base64, shown as "v1,whsec_<base64>" in the Supabase dashboard.
 */
export async function verifyStandardWebhook(headers: Headers, rawBody: string, secret: string, nowSec: number, toleranceSeconds = 300): Promise<boolean> {
  const id = headers.get("webhook-id") ?? "";
  const ts = Number(headers.get("webhook-timestamp"));
  const sigHeader = headers.get("webhook-signature") ?? "";
  if (!id || !sigHeader || !Number.isInteger(ts) || Math.abs(nowSec - ts) > toleranceSeconds) return false;
  let keyBytes: Uint8Array;
  try { keyBytes = b64ToBytes(secret.replace(/^v1,/, "").replace(/^whsec_/, "")); } catch { return false; }
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${ts}.${rawBody}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sigHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && sig !== undefined && timingSafeEqual(sig, expected);
  });
}

const deny = (status: number, msg: string) => ({ ok: false as const, response: Response.json({ error: msg }, { status }) });

export async function guardPublicRoute(request: Request, opts: GuardOptions): Promise<GuardResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = opts.limit ?? { windowSeconds: 60, max: 60 };
  const { data: allowed, error } = await supabaseAdmin.rpc("rate_limit_hit", { _bucket: `${opts.name}:${ip}`, _window_seconds: limit.windowSeconds, _max: limit.max });
  if (error) return deny(503, "unavailable");
  if (!allowed) return deny(429, "too many requests");

  let secret: string | undefined = opts.secretEnv ? process.env[opts.secretEnv] : undefined;
  if (opts.secretDb) {
    const { data } = await supabaseAdmin.from("internal_secrets").select("value").eq("name", opts.secretDb).maybeSingle();
    secret = data?.value;
  }
  if (opts.secretEnvs) {
    const candidates = opts.secretEnvs.map((c) => ({ tag: c.tag, secret: process.env[c.env] })).filter((c): c is { tag: string; secret: string } => Boolean(c.secret));
    if (!candidates.length) return deny(503, "not configured");
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) return deny(413, "payload too large");
    for (const c of candidates) if (await verifyAuth(opts.auth, c.secret, request.headers, rawBody)) return { ok: true, rawBody, matched: c.tag };
    return deny(401, "invalid signature");
  }
  if (!secret) return deny(503, "not configured");
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return deny(413, "payload too large");
  if (!(await verifyAuth(opts.auth, secret, request.headers, rawBody))) return deny(401, "invalid signature");
  return { ok: true, rawBody };
}
