// DB + eSIMerge API bindings for webhook processing. Never logs activation data.
import type { EventStore, Outcome, WebhookDeps, ParsedEvent } from "./esimerge-webhook";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export const dbEventStore: EventStore = {
  async insert(row) {
    const db = await admin();
    const { data, error } = await db
      .from("provider_webhook_events")
      .upsert({ event_id: row.eventId, delivery_id: row.deliveryId, event_type: row.type, payload: row.payload as never, mode: row.mode, signature_valid: true }, { onConflict: "event_id", ignoreDuplicates: true })
      .select("id");
    if (error) { console.error("webhook_store_failed", row.eventId, error.message); throw new Error("webhook_store_unavailable"); }
    return (data ?? []).length > 0;
  },
  async finish(eventId, o: Outcome) {
    const db = await admin();
    const { error } = await db.from("provider_webhook_events").update({ status: o.status, error: o.error ?? null, order_id: o.orderId ?? null, processed_at: new Date().toISOString() }).eq("event_id", eventId);
    if (error) console.error("webhook_finish_failed", eventId, error.message);
  },
};

export const dbWebhookDeps: WebhookDeps = {
  async findOrder(refs: ParsedEvent["refs"]) {
    const db = await admin();
    let q = db.from("esims").select("order_id,provider_order_id,provider_esim_id,lpa_string,usage_alerts_sent,orders!inner(id,status,is_sandbox)").limit(1);
    if (refs.orderId) q = q.eq("provider_order_id", refs.orderId);
    else if (refs.esimId) q = q.eq("provider_esim_id", refs.esimId);
    else if (refs.iccid) q = q.eq("iccid", refs.iccid);
    else if (refs.customerReference && /^[0-9a-f-]{36}$/i.test(refs.customerReference)) q = q.eq("order_id", refs.customerReference);
    else return null;
    let { data } = await q.maybeSingle();
    // Fallback: our own reference (customer_reference = our order id) when the eSIMerge id is not stored yet.
    if (!data && refs.orderId && refs.customerReference && /^[0-9a-f-]{36}$/i.test(refs.customerReference)) {
      ({ data } = await db.from("esims").select("order_id,provider_order_id,provider_esim_id,lpa_string,usage_alerts_sent,orders!inner(id,status,is_sandbox)").eq("order_id", refs.customerReference).limit(1).maybeSingle());
    }
    if (!data) return null;
    const o = data.orders as unknown as { id: string; status: string; is_sandbox: boolean };
    return { id: o.id, status: o.status, isSandbox: o.is_sandbox, providerOrderId: data.provider_order_id, providerEsimId: data.provider_esim_id, hasInstallData: Boolean(data.lpa_string), alertsSent: data.usage_alerts_sent ?? [] };
  },
  async getOrder(id) {
    const { getProvider } = await import("./providers/index.server");
    const r = await getProvider().getOrder!(id);
    return { amountUsd: r.amountUsd, status: r.status, orderStatus: r.orderStatus, errorCode: r.errorCode, activatedAt: r.activatedAt, providerStatus: r.esim?.providerStatus, esim: r.esim };
  },
  async getUsagePercent(esimId) {
    const { getProvider } = await import("./providers/index.server");
    const u = await getProvider().getUsage!(esimId);
    return u.totalMb ? Math.round((u.usedMb / u.totalMb) * 100) : null;
  },
  async markIssued(orderId, api) {
    const { dbFulfillmentStore } = await import("./fulfillment.server");
    const db = await admin();
    const { data } = await db.from("esims").select("provider_order_id").eq("order_id", orderId).single();
    await dbFulfillmentStore.markFulfilled(orderId, data!.provider_order_id!, api.esim as never);
    const amount = api.amountUsd;
    if (amount != null) { const { recordActualCost } = await import("./fulfillment.server"); await recordActualCost(orderId, amount); }
  },
  async markFailed(orderId, code) {
    const db = await admin();
    const { errorCodeLabel } = await import("./esimerge-order");
    const err = `${errorCodeLabel(code)}${code ? ` (Code: ${code})` : ""}`.slice(0, 300);
    await db.from("orders").update({ status: "fulfillment_failed", last_error: err, next_attempt_at: null }).eq("id", orderId).neq("status", "fulfilled");
    await db.from("audit_log").insert({ action: "provider_order_failed", entity: "order", entity_id: orderId, meta: { code: code ?? null, message: err } });
    const { sendOrderEmail } = await import("./email.server");
    await sendOrderEmail(orderId, "failure");
  },
  async markCancelled(orderId) {
    const db = await admin();
    await db.from("orders").update({ status: "cancelled", last_error: "eSIMerge: Bestellung storniert – Erstatten prüfen", next_attempt_at: null }).eq("id", orderId);
    await db.from("esims").update({ status: "cancelled" }).eq("order_id", orderId);
    await db.from("audit_log").insert({ action: "provider_order_cancelled", entity: "order", entity_id: orderId, meta: { message: "Von eSIMerge storniert – Erstatten prüfen" } });
  },
  async setEsim(orderId, patch) {
    const db = await admin();
    await db.from("esims").update(patch).eq("order_id", orderId);
  },
  async sendUsageMail(orderId) {
    // Usage hint mail; sendOrderEmail stays blocked until sending is set up. No top-up link (no top-up product).
    const { sendOrderEmail } = await import("./email.server");
    await sendOrderEmail(orderId, "usage_alert");
  },
  now: () => new Date(),
};

/** Retries events still pending (e.g. the background run was cut off). Called from the status poll. */
export async function processPendingWebhookEvents(limit = 20) {
  const db = await admin();
  const { data } = await db.from("provider_webhook_events").select("event_id,delivery_id,mode,payload_raw:payload").eq("status", "pending").lt("received_at", new Date(Date.now() - 60_000).toISOString()).limit(limit);
  // Stored payload is sanitized (no ICCID); events whose refs were masked cannot be replayed and are marked failed.
  const { parseEvent, processStored } = await import("./esimerge-webhook");
  for (const r of data ?? []) {
    const ev = parseEvent(r.payload_raw, r.delivery_id);
    if (!ev) { await dbEventStore.finish(r.event_id, { status: "failed", error: "unparseable" }); continue; }
    await processStored(dbEventStore, dbWebhookDeps, ev, r.mode as "sandbox" | "live");
  }
}
