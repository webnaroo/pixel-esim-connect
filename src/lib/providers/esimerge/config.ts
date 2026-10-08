// eSIMerge configuration. << Fill in once API docs / credentials arrive. >>
// Contains NO secret values – only the names of the env vars that hold them.

export type EndpointDef = { method: "GET" | "POST" | "PUT" | "DELETE"; path: string };
export type AuthType = "bearer" | "header" | "basic" | "oauth2";

export type EsimergeConfig = {
  baseUrlEnv: string;
  auth: { type: AuthType | null; headerName: string | null; tokenEnv: string };
  endpoints: Record<
    | "ping" | "listCountries" | "listRegions" | "listPlans" | "getPlan" | "checkAvailability"
    | "createOrder" | "getEsim" | "getUsage" | "topUp" | "cancel",
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
  baseUrlEnv: "ESIMERGE_BASE_URL",
  // TODO(ESIMERGE): auth scheme (bearer | header | basic | oauth2) and header name
  auth: { type: null, headerName: null, tokenEnv: "ESIMERGE_API_KEY" },
  endpoints: {
    ping: null, // TODO(ESIMERGE): { method: 'GET', path: '/...' }
    listCountries: null, // TODO(ESIMERGE)
    listRegions: null, // TODO(ESIMERGE)
    listPlans: null, // TODO(ESIMERGE): paging / filter params
    getPlan: null, // TODO(ESIMERGE)
    checkAvailability: null, // TODO(ESIMERGE)
    createOrder: null, // TODO(ESIMERGE)
    getEsim: null, // TODO(ESIMERGE): path may contain ':orderId'
    getUsage: null, // TODO(ESIMERGE): path may contain ':iccid'
    topUp: null, // TODO(ESIMERGE)
    cancel: null, // TODO(ESIMERGE)
  },
  paging: { style: null, pageSize: null }, // TODO(ESIMERGE)
  capabilities: {
    // Controls which UI parts are shown. Switch on only once confirmed by eSIMerge.
    usage: false, topUp: false, cancel: false, webhooks: false,
    directInstallLink: false, unlimitedPlans: false, idempotencyKey: false,
  },
  // TODO(ESIMERGE): signature header, algorithm, event id field
  webhook: { signatureHeader: null, algorithm: null, secretEnv: "ESIMERGE_WEBHOOK_SECRET", eventIdField: null },
  currency: { cost: null }, // TODO(ESIMERGE): 'USD' | 'EUR'
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
