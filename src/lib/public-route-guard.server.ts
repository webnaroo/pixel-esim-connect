// Mandatory guard for every server route under src/routes/api/public/*.
// Each handler must call guardPublicRoute() first: it rate-limits by caller IP
// and verifies either an HMAC signature over the raw body or a shared secret token.

export type GuardOptions = {
  name: string; // bucket prefix, e.g. "stripe-webhook"
  secretEnv: string; // env var holding the secret; missing => 503, never bypassed
  auth: { kind: "hmac-sha256"; header: string; prefix?: string } | { kind: "bearer" };
  limit?: { windowSeconds: number; max: number };
};

export type GuardResult = { ok: true; rawBody: string } | { ok: false; response: Response };

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
  let given = headers.get(opts.header) ?? "";
  if (opts.prefix) {
    if (!given.startsWith(opts.prefix)) return false;
    given = given.slice(opts.prefix.length);
  }
  return given.length > 0 && timingSafeEqual(given.toLowerCase(), await hmacSha256Hex(secret, rawBody));
}

const deny = (status: number, msg: string) => ({ ok: false as const, response: Response.json({ error: msg }, { status }) });

export async function guardPublicRoute(request: Request, opts: GuardOptions): Promise<GuardResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = opts.limit ?? { windowSeconds: 60, max: 60 };
  const { data: allowed, error } = await supabaseAdmin.rpc("rate_limit_hit", { _bucket: `${opts.name}:${ip}`, _window_seconds: limit.windowSeconds, _max: limit.max });
  if (error) return deny(503, "unavailable");
  if (!allowed) return deny(429, "too many requests");

  const secret = process.env[opts.secretEnv];
  if (!secret) return deny(503, "not configured");
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return deny(413, "payload too large");
  if (!(await verifyAuth(opts.auth, secret, request.headers, rawBody))) return deny(401, "invalid signature");
  return { ok: true, rawBody };
}
