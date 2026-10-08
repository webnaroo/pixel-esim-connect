// eSIMerge configuration. << Fill in once API docs / credentials arrive. >>
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
  // If the connection test returns 404, try base .../v1 with paths without /v1 (record result in docs/INTEGRATION.md).
  baseUrlEnv: "ESIMERGE_BASE_URL",
  auth: { type: "bearer", headerName: null, tokenEnv: "ESIMERGE_API_KEY" },
  endpoints: {
    ping: { method: "GET", path: "/v1/catalog" }, // first page only
    listCountries: null, // not documented – derived from catalog
    listRegions: null, // not documented – derived from catalog
    listPlans: { method: "GET", path: "/v1/catalog" }, // TODO(ESIMERGE): paging params from real response
    getPlan: { method: "GET", path: "/v1/catalog/:planId" },
    checkAvailability: { method: "GET", path: "/v1/catalog/:planId" }, // plan exists and is active
    createOrder: { method: "POST", path: "/v1/orders" }, // body { plan_id }
    getOrder: { method: "GET", path: "/v1/orders/:orderId" },
    getEsim: { method: "GET", path: "/v1/esims/:esimId" },
    getUsage: { method: "GET", path: "/v1/esims/:esimId/usage" },
    topUp: null, // not documented
    cancel: null, // not documented
  },
  paging: { style: null, pageSize: null }, // TODO(ESIMERGE): from real catalog response
  capabilities: {
    usage: true, topUp: false, cancel: false, webhooks: false,
    directInstallLink: false,
    unlimitedPlans: false, // TODO(ESIMERGE): determine from catalog
    idempotencyKey: false, // not documented – own DB lock only
  },
  webhook: { signatureHeader: null, algorithm: null, secretEnv: "ESIMERGE_WEBHOOK_SECRET", eventIdField: null }, // no webhooks documented
  currency: { cost: null }, // TODO(ESIMERGE): cost currency from real catalog response
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
