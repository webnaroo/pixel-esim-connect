import { mapOrderStatus } from "../../esimerge-order";
import { maskSensitive } from "@/lib/mask";
// eSIMerge -> internal type mapping, written against real SANDBOX responses (sandbox.fixtures.ts).
// Pure functions only.

import {
  ProviderNotConfiguredError,
  ProviderRequestError,
  type EsimDetails,
  type EsimUsage,
  type NormalizedPlan,
  type NormalizedProviderEvent,
  type ProviderCountry,
  type ProviderOrderResult,
  type ProviderRegion,
} from "../types";
import { esimSchema, listSchema, orderSchema, planSchema, usageSchema } from "./schemas";

export const MAPPING_READY = true;

/** Cost currency confirmed by the catalog (`currency: "USD"`, field `price_usd`). */
export const COST_CURRENCY = "USD";

export function extractList(raw: unknown, endpoint: string): unknown[] {
  const r = listSchema.safeParse(raw);
  if (!r.success) throw new ProviderRequestError("Unerwartete Listenantwort", undefined, endpoint);
  return r.data.data;
}

/** Offset of the next page (catalog uses limit/offset with has_more/next_offset); null when done. */
export function nextPage(raw: unknown): number | null {
  const r = listSchema.safeParse(raw);
  if (!r.success || !r.data.has_more) return null;
  return r.data.next_offset ?? null;
}

// No country/region endpoints exist; both are derived from the catalog.
export function mapCountry(_raw: unknown): ProviderCountry {
  throw new ProviderNotConfiguredError("endpoints.listCountries");
}
export function mapRegion(_raw: unknown): ProviderRegion {
  throw new ProviderNotConfiguredError("endpoints.listRegions");
}

export type CatalogItemResult = { ok: true; plan: NormalizedPlan } | { ok: false; providerPlanId: string | null; reason: string };

// Special codes confirmed by eSIMerge (email, Alex Brandon): territories within a country
// (own destination in the shop) and alternative product lines (imported hidden by default).
export const TERRITORY_CODES = new Set(["GB-SCT", "PT-30", "PT-20", "BQ-SA", "BQ-SE", "NOC", "XK", "IC", "AN", "CB"]);
export const ALT_PRODUCT_CODES = new Set(["SGA", "AUA", "RUA", "RULA", "CNA", "CNMA", "CNM", "CHE", "EUP"]);

/** Maps one catalog entry, or explains why it cannot be mapped (never silently dropped). */
export function mapCatalogItem(raw: unknown): CatalogItemResult {
  const id = raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : null;
  const r = planSchema.safeParse(raw);
  if (!r.success) return { ok: false, providerPlanId: id, reason: `Unerwartetes Format: ${r.error.issues[0]?.path.join(".") ?? "?"}` };
  const p = r.data;
  if (p.currency.toUpperCase() !== COST_CURRENCY) return { ok: false, providerPlanId: p.id, reason: `Unbekannte Einkaufswährung ${p.currency}` };

  let coverage: NormalizedPlan["coverage"];
  let destinationKind: NormalizedPlan["destinationKind"];
  if (p.scope === "country") {
    const iso = (p.country_code ?? "").toUpperCase();
    if (/^[A-Z]{2}$/.test(iso)) destinationKind = "standard";
    else if (TERRITORY_CODES.has(iso)) destinationKind = "territory";
    else if (ALT_PRODUCT_CODES.has(iso)) destinationKind = "alt";
    else return { ok: false, providerPlanId: p.id, reason: "Länderkennung fehlt oder ungültig" };
    coverage = { kind: "country", countries: [iso] };
  } else if (p.scope === "region") {
    if (!p.region_code) return { ok: false, providerPlanId: p.id, reason: "Regionskennung fehlt" };
    // No country list is provided for regions: shown on the region page only.
    coverage = { kind: "region", countries: [], regionCode: p.region_code.toUpperCase() };
  } else if (p.scope === "global") {
    coverage = { kind: "global", countries: [] };
  } else {
    return { ok: false, providerPlanId: p.id, reason: `Unbekannter Geltungsbereich ${p.scope}` };
  }

  let type: NormalizedPlan["type"];
  // Owner decision: calling plans (voice/SMS) are not imported for now.
  if (p.type === "calling") return { ok: false, providerPlanId: p.id, reason: "Telefonie-Tarif (vorerst nicht importiert)" };
  if (p.type === "fixed") type = "data";
  else if (p.type === "unlimited") type = "unlimited";
  else return { ok: false, providerPlanId: p.id, reason: `Unbekannter Tariftyp ${p.type}` };

  if (type === "data" && !(p.data_mb && p.data_mb > 0)) return { ok: false, providerPlanId: p.id, reason: "Datenmenge fehlt" };

  const voiceSms = p.minutes || p.sms ? { minutes: p.minutes ?? null, sms: p.sms ?? null } : undefined;
  return {
    ok: true,
    plan: {
      providerPlanId: p.id,
      type,
      coverage,
      dataMb: type === "unlimited" ? null : p.data_mb,
      validityDays: p.validity_days,
      ...(p.networks?.length ? { networks: p.networks } : {}),
      ...(voiceSms ? { voiceSms } : {}),
      ...(p.fair_usage ? { fairUse: { note: p.fair_usage } } : {}),
      costPrice: p.price_usd,
      costCurrency: COST_CURRENCY,
      // Owner rule: GlobeSIM sells one-time eSIMs only; missing top-up info means no top-up.
      ...(p.supports_topup !== undefined ? { topUpable: p.supports_topup ?? false } : {}),
      raw: maskSensitive(raw),
    },
  };
}

export function mapPlan(raw: unknown): NormalizedPlan {
  const r = mapCatalogItem(raw);
  if (!r.ok) throw new ProviderRequestError(r.reason, undefined, "listPlans");
  return r.plan;
}

/** checkAvailability uses GET catalog/:id — a plan that is returned is purchasable. */
export function mapAvailability(raw: unknown): { available: boolean; reason?: string } {
  const r = mapCatalogItem(raw);
  return r.ok ? { available: true } : { available: false, reason: r.reason };
}

export function mapEsim(raw: unknown): EsimDetails {
  const e = esimSchema.parse(raw);
  const status = e.status.toLowerCase();
  return {
    providerEsimId: e.id,
    providerStatus: e.status,
    ...(e.iccid ? { iccid: e.iccid } : {}),
    ...(e.smdp_address ? { smdpAddress: e.smdp_address } : {}),
    ...(e.activation_code ? { activationCode: e.activation_code } : {}),
    ...(e.qr_code?.startsWith("LPA:") ? { lpaString: e.qr_code } : {}),
    ...(e.ios_install_url ? { iosInstallUrl: e.ios_install_url } : {}),
    ...(e.android_install_url ? { androidInstallUrl: e.android_install_url } : {}),
    installStatus: status === "active" ? "active" : "waiting",
    ...(e.expires_at ? { expiresAt: e.expires_at } : {}),
  };
}

/** True once installation data is present (LPA string, or SM-DP+ plus activation code). */
export function hasInstallData(e: EsimDetails | undefined): boolean {
  return Boolean(e && (e.lpaString || (e.smdpAddress && e.activationCode)));
}

export function mapOrder(raw: unknown): ProviderOrderResult {
  const o = orderSchema.parse(raw);
  const esim = o.esim ? mapEsim(o.esim) : undefined;
  return {
    providerOrderId: o.id,
    status: hasInstallData(esim) ? "ready" : "pending",
    orderStatus: mapOrderStatus(o.status),
    ...(esim ? { esim } : {}),
    ...(o.error?.code ? { errorCode: o.error.code } : {}), // error.message is deliberately not passed on
    ...(typeof o.amount_usd === "number" ? { amountUsd: o.amount_usd } : {}),
    ...(o.activated_at ?? o.esim?.activated_at ? { activatedAt: (o.activated_at ?? o.esim?.activated_at)! } : {}),
  };
}

export function mapUsage(raw: unknown): EsimUsage {
  const u = usageSchema.parse(raw);
  return { usedMb: u.data_used_mb, totalMb: u.data_allowed_mb, ...(u.expires_at ? { expiresAt: u.expires_at } : {}) };
}

// eSIMerge documents no webhooks.
export function mapWebhookEvent(_raw: unknown): NormalizedProviderEvent {
  throw new ProviderNotConfiguredError("capabilities.webhooks");
}

export function buildCreateOrderBody(input: { providerPlanId: string; customerReference?: string }): unknown {
  return { plan_id: input.providerPlanId, ...(input.customerReference ? { customer_reference: input.customerReference.slice(0, 120) } : {}) };
}

export function buildLpaString(smdpAddress: string, activationCode: string): string {
  return `LPA:1$${smdpAddress}$${activationCode}`;
}

export const SENSITIVE_KEYS = [
  "token", "apikey", "api_key", "secret", "password", "authorization",
  "activation_code", "activationcode", "matching_id", "matchingid", "lpa", "qr", "smdp", "iccid", "install_url",
];

export function sanitize(value: unknown): unknown {
  return maskSensitive(value);
}

/** Sandbox keys start with this prefix. */
export const isSandboxKey = (key: string | undefined) => Boolean(key?.startsWith("esm_sk_test_"));
