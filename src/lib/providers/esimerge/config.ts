// eSIMerge configuration (sandbox-verified 2026-10-08).
// Contains NO secret values – only the names of the env vars that hold them.

export type EndpointDef = { method: "GET" | "POST" | "PUT" | "DELETE"; path: string };
export type AuthType = "bearer" | "header" | "basic" | "oauth2";

export type EsimergeConfig = {
  baseUrlEnv: string;
  auth: { type: AuthType | null; headerName: string | null; tokenEnv: string };
  endpoints: Record<
    | "ping" | "listCountries" | "listRegions" | "listPlans" | "getPlan" | "checkAvailability"
    | "createOrder" | "getOrder" | "getEsim" | "getUsage" | "topUp" | "cancel",
    EndpointDef | null
  >;
  paging: { style: "page" | "cursor" | "offset" | null; pageSize: number | null };
  capabilities: {
    usage: boolean; topUp: boolean; cancel: boolean; webhooks: boolean;
    directInstallLink: boolean; unlimitedPlans: boolean; idempotencyKey: boolean;
  };
  webhook: { signatureHeader: string | null; algorithm: "hmac-sha256" | null; secretEnv: string; eventIdField: string | null };
  currency: { cost: string | null };
  limits: { rateLimitPerMinute: number | null; timeoutMs: number };
};

export const esimergeConfig: EsimergeConfig = {
  // Documented sandbox base URL: https://portal.esimerge.com/api/public (paths carry /v1).
  // Verified: base without /v1 + paths with /v1 returns 200.
  baseUrlEnv: "ESIMERGE_BASE_URL",
  auth: { type: "bearer", headerName: null, tokenEnv: "ESIMERGE_API_KEY" },
  endpoints: {
    ping: { method: "GET", path: "/v1/catalog" }, // first page only
    listCountries: null, // not documented – derived from catalog
    listRegions: null, // not documented – derived from catalog
    listPlans: { method: "GET", path: "/v1/catalog" },
    getPlan: { method: "GET", path: "/v1/catalog/:planId" },
    checkAvailability: { method: "GET", path: "/v1/catalog/:planId" }, // plan exists and is active
    createOrder: { method: "POST", path: "/v1/orders" }, // body { plan_id }
    getOrder: { method: "GET", path: "/v1/orders/:orderId" },
    getEsim: { method: "GET", path: "/v1/esims/:esimId" },
    getUsage: { method: "GET", path: "/v1/esims/:esimId/usage" }, // cached 5 min
    topUp: null, // not documented
    cancel: null, // not documented
  },
  // Catalog response: limit/offset/has_more/next_offset; default limit 1000 (sandbox: 8 plans, one page).
  paging: { style: "offset", pageSize: 1000 },
  capabilities: {
    usage: true, topUp: false, cancel: false, webhooks: true,
    directInstallLink: false,
    unlimitedPlans: true, // catalog has type "unlimited" (data_mb 0 + fair_usage text)
    // Verified 2026-10-08: POST /v1/orders REQUIRES "Idempotency-Key"; the same key replays the
    // same order (header "idempotent-replayed: true"). Our DB claim lock stays in place as well.
    idempotencyKey: true,
  },
  webhook: { signatureHeader: "X-eSimerge-Signature", algorithm: "hmac-sha256", secretEnv: "ESIMERGE_WEBHOOK_SECRET", eventIdField: "id" }, // owner docs: "t=<unix>,v1=<hex>", see src/lib/esimerge-webhook.ts
  currency: { cost: "USD" }, // catalog: currency "USD", cost field price_usd
  limits: { rateLimitPerMinute: null, timeoutMs: 8000 },
};

/** Endpoints that must be set before the shop can leave setup mode. */
export const REQUIRED_ENDPOINTS = ["ping", "listPlans", "createOrder", "getEsim"] as const;

/** Returns a list of missing config items (empty = config complete). Pure, no env access. */
export function missingConfig(cfg: EsimergeConfig = esimergeConfig): string[] {
  const missing: string[] = [];
  if (!cfg.auth.type) missing.push("auth.type");
  if (cfg.auth.type === "header" && !cfg.auth.headerName) missing.push("auth.headerName");
  for (const e of REQUIRED_ENDPOINTS) if (!cfg.endpoints[e]) missing.push(`endpoints.${e}`);
  if (!cfg.currency.cost) missing.push("currency.cost");
  return missing;
}
