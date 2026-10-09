// Provider-agnostic types. The rest of the app only ever sees these shapes.

export type ProviderHealth = { ok: boolean; latencyMs: number; message?: string };

export type ProviderCountry = { iso2: string; name?: string; providerRef: unknown };
export type ProviderRegion = { code: string; name?: string; countries: string[]; providerRef: unknown };

export interface NormalizedPlan {
  providerPlanId: string;
  type: "data" | "unlimited";
  coverage: { kind: "country" | "region" | "global"; countries: string[]; regionCode?: string };
  dataMb: number | null;
  validityDays: number;
  networks?: string[];
  networkType?: string;
  hotspot?: boolean;
  voiceSms?: Record<string, unknown>;
  fairUse?: { throttleAfterMb?: number; throttledSpeedKbps?: number; note?: string };
  costPrice: number;
  costCurrency: string;
  topUpable?: boolean;
  raw?: unknown;
}

export type ProviderOrderResult = {
  providerOrderId: string;
  status: "pending" | "ready";
  esim?: EsimDetails;
  /** Order status as reported by the provider API (eSIMerge: pending|issued|active|expired|cancelled|failed). */
  orderStatus?: import("../esimerge-order").EsmOrderStatus;
  /** Provider error code when failed (admin only; never shown raw to customers). */
  errorCode?: string;
  /** Actual purchase price of this order in USD. */
  amountUsd?: number;
  activatedAt?: string;
};

export type EsimDetails = {
  providerEsimId?: string;
  providerStatus?: string;
  iosInstallUrl?: string;
  androidInstallUrl?: string;
  iccid?: string;
  smdpAddress?: string;
  activationCode?: string;
  lpaString?: string;
  qrImageUrl?: string;
  directInstallUrl?: string;
  installStatus?: "waiting" | "installed" | "active";
  expiresAt?: string;
};

export type EsimUsage = { usedMb: number; totalMb: number | null; expiresAt?: string };

export type NormalizedProviderEvent = {
  eventId: string;
  type: "esim.ready" | "esim.installed" | "esim.activated" | "esim.usage" | "esim.expired" | "unknown";
  providerOrderId?: string;
  iccid?: string;
  data?: unknown;
};

export interface ProviderAdapter {
  ping(): Promise<ProviderHealth>;
  listCountries(): Promise<ProviderCountry[]>;
  listRegions(): Promise<ProviderRegion[]>;
  /** Plans plus entries that could not be mapped (with reason). */
  listPlansDetailed?(): Promise<{ plans: NormalizedPlan[]; unmapped: { providerPlanId: string | null; reason: string }[] }>;
  listPlans(scope?: { countryIso2?: string; regionCode?: string }): Promise<NormalizedPlan[]>;
  checkAvailability(providerPlanId: string): Promise<{ available: boolean; reason?: string }>;
  createOrder(input: { providerPlanId: string; customerEmail: string; idempotencyKey: string; customerReference?: string }): Promise<ProviderOrderResult>;
  getEsim(providerOrderId: string): Promise<EsimDetails>;
  getOrder?(providerOrderId: string): Promise<ProviderOrderResult>;
  getUsage?(providerEsimId: string): Promise<EsimUsage>;
  topUp?(iccid: string, providerPlanId: string, idempotencyKey: string): Promise<void>;
  cancel?(providerOrderId: string): Promise<void>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  parseWebhook(rawBody: string): NormalizedProviderEvent;
}

export class ProviderNotConfiguredError extends Error {
  readonly code = "E-PROVIDER-NOT-CONFIGURED";
  constructor(public readonly missing: string) {
    super(`Provider not configured: ${missing}`);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderRequestError extends Error {
  readonly code = "E-PROVIDER-REQUEST";
  constructor(message: string, public readonly status?: number, public readonly endpoint?: string, public readonly info?: import("../esimerge-errors").EsmErrorInfo) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export class ProviderUnavailableError extends Error {
  readonly code = "E-PROVIDER-UNAVAILABLE";
  constructor(message = "Provider temporarily unavailable (circuit open)") {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
