// eSIMerge -> internal type mapping. << Fill in once example responses arrive. >>
// Pure functions only. Until filled they throw ProviderNotConfiguredError,
// so nothing invented can ever reach the database or the UI.

import {
  ProviderNotConfiguredError,
  type EsimDetails,
  type EsimUsage,
  type NormalizedPlan,
  type NormalizedProviderEvent,
  type ProviderCountry,
  type ProviderOrderResult,
  type ProviderRegion,
} from "../types";

/** Set to true once every function below has been implemented against real samples. */
export const MAPPING_READY = false;

const notReady = (fn: string): never => {
  throw new ProviderNotConfiguredError(`mapping.${fn}`);
};

/** TODO(ESIMERGE): extract the list array from a (paged) response body. */
export function extractList(_raw: unknown, _endpoint: string): unknown[] {
  return notReady("extractList");
}

/** TODO(ESIMERGE): next cursor/page from a list response; null when done. */
export function nextPage(_raw: unknown): string | number | null {
  return notReady("nextPage");
}

export function mapCountry(_raw: unknown): ProviderCountry {
  return notReady("mapCountry"); // TODO(ESIMERGE)
}

export function mapRegion(_raw: unknown): ProviderRegion {
  return notReady("mapRegion"); // TODO(ESIMERGE)
}

/**
 * TODO(ESIMERGE): distinguish type 'data' vs 'unlimited', convert volume to MB,
 * map coverage ISO codes, fair-use only if supplied by eSIMerge.
 */
export function mapPlan(_raw: unknown): NormalizedPlan {
  return notReady("mapPlan");
}

export function mapAvailability(_raw: unknown): { available: boolean; reason?: string } {
  return notReady("mapAvailability"); // TODO(ESIMERGE)
}

export function mapOrder(_raw: unknown): ProviderOrderResult {
  return notReady("mapOrder"); // TODO(ESIMERGE)
}

export function mapEsim(_raw: unknown): EsimDetails {
  return notReady("mapEsim"); // TODO(ESIMERGE)
}

export function mapUsage(_raw: unknown): EsimUsage {
  return notReady("mapUsage"); // TODO(ESIMERGE)
}

export function mapWebhookEvent(_raw: unknown): NormalizedProviderEvent {
  return notReady("mapWebhookEvent"); // TODO(ESIMERGE)
}

/** TODO(ESIMERGE): request body for createOrder. */
export function buildCreateOrderBody(_input: { providerPlanId: string; customerEmail: string; idempotencyKey: string }): unknown {
  return notReady("buildCreateOrderBody");
}

/** Builds a standard LPA activation string when eSIMerge only returns SM-DP+ and code. */
export function buildLpaString(smdpAddress: string, activationCode: string): string {
  return `LPA:1$${smdpAddress}$${activationCode}`;
}

/** Keys masked before raw responses are logged or shown in the admin API explorer. */
export const SENSITIVE_KEYS = [
  "token", "apikey", "api_key", "secret", "password", "authorization",
  "activation_code", "activationcode", "matching_id", "matchingid", "lpa", "qr", "smdp",
];

export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEYS.some((s) => k.toLowerCase().replace(/[-_]/g, "").includes(s.replace(/_/g, "")))
          ? "***"
          : sanitize(v),
      ]),
    );
  }
  return value;
}
