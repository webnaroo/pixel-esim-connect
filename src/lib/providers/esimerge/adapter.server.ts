import { esimergeConfig } from "./config";
import * as m from "./mapping";
import { providerEnv, providerRequest, verifyHmacSha256 } from "./client.server";
import { ProviderNotConfiguredError, type NormalizedPlan, type ProviderAdapter } from "../types";

const ep = esimergeConfig.endpoints;

async function listAll(name: keyof typeof ep, query: Record<string, string | undefined> = {}): Promise<unknown[]> {
  const items: unknown[] = [];
  let cursor: string | number | null = null;
  const { style, pageSize } = esimergeConfig.paging;
  for (let guard = 0; guard < 200; guard++) {
    const q: Record<string, string | number | undefined> = { ...query };
    // Paging: limit/offset (seen in catalog response)
    if (style && pageSize) q[style === "cursor" ? "cursor" : style === "page" ? "page" : "offset"] = cursor ?? (style === "cursor" ? undefined : style === "page" ? 1 : 0);
    if (pageSize) q['limit'] = pageSize;
    const { body } = await providerRequest(name, ep[name], { query: q });
    items.push(...m.extractList(body, name));
    if (!style) break;
    cursor = m.nextPage(body);
    if (cursor == null) break;
  }
  return items;
}

export const esimergeAdapter: ProviderAdapter = {
  async ping() {
    const { latencyMs, status } = await providerRequest("ping", ep.ping, { query: { limit: 1 } });
    return { ok: status < 400, latencyMs };
  },
  async listCountries() {
    return (await listAll("listCountries")).map(m.mapCountry);
  },
  async listRegions() {
    return (await listAll("listRegions")).map(m.mapRegion);
  },
  async listPlansDetailed() {
    const plans: NormalizedPlan[] = [];
    const unmapped: { providerPlanId: string | null; reason: string }[] = [];
    for (const raw of await listAll("listPlans")) {
      const r = m.mapCatalogItem(raw);
      if (r.ok) plans.push(r.plan);
      else unmapped.push({ providerPlanId: r.providerPlanId, reason: r.reason });
    }
    return { plans, unmapped };
  },
  async listPlans() {
    // The catalog endpoint has no documented filter parameters; filtering happens locally.
    return (await esimergeAdapter.listPlansDetailed!()).plans;
  },
  async checkAvailability(providerPlanId) {
    if (!ep.checkAvailability) return { available: true }; // no endpoint -> rely on createOrder result
    const { body } = await providerRequest("checkAvailability", ep.checkAvailability, { params: { planId: providerPlanId } });
    return m.mapAvailability(body);
  },
  async createOrder(input) {
    const { body } = await providerRequest("createOrder", ep.createOrder, {
      body: m.buildCreateOrderBody(input),
      idempotencyKey: esimergeConfig.capabilities.idempotencyKey ? input.idempotencyKey : undefined,
      idempotencyHeader: esimergeConfig.capabilities.idempotencyKey ? "Idempotency-Key" : undefined, // verified header name
    });
    return m.mapOrder(body);
  },
  async getOrder(providerOrderId) {
    const { body } = await providerRequest("getOrder", ep.getOrder, { params: { orderId: providerOrderId } });
    return m.mapOrder(body);
  },
  async getEsim(providerOrderId) {
    // Installation data is embedded in GET /v1/orders/:id.
    const r = await esimergeAdapter.getOrder!(providerOrderId);
    if (!r.esim) throw new ProviderNotConfiguredError("order.esim");
    return r.esim;
  },
  async getUsage(providerEsimId) {
    if (!esimergeConfig.capabilities.usage) throw new ProviderNotConfiguredError("capabilities.usage");
    const { body } = await providerRequest("getUsage", ep.getUsage, { params: { esimId: providerEsimId } });
    return m.mapUsage(body);
  },
  async topUp(iccid, providerPlanId, idempotencyKey) {
    if (!esimergeConfig.capabilities.topUp) throw new ProviderNotConfiguredError("capabilities.topUp");
    await providerRequest("topUp", ep.topUp, { params: { iccid }, body: { providerPlanId, idempotencyKey } /* not documented; capability off */ });
  },
  async cancel(providerOrderId) {
    if (!esimergeConfig.capabilities.cancel) throw new ProviderNotConfiguredError("capabilities.cancel");
    await providerRequest("cancel", ep.cancel, { params: { orderId: providerOrderId } });
  },
  async verifyWebhook(rawBody, headers) {
    const { signatureHeader, algorithm } = esimergeConfig.webhook;
    const { webhookSecret } = providerEnv();
    if (!signatureHeader || !algorithm) throw new ProviderNotConfiguredError("webhook.signatureHeader");
    if (!webhookSecret) throw new ProviderNotConfiguredError(esimergeConfig.webhook.secretEnv);
    const sig = headers.get(signatureHeader);
    if (!sig) return false;
    return verifyHmacSha256(rawBody, sig, webhookSecret);
  },
  parseWebhook(rawBody) {
    return m.mapWebhookEvent(JSON.parse(rawBody));
  },
};
