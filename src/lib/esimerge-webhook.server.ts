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
    if (error) throw new Error("webhook_store_unavailable");
    return (data ?? []).length > 0;
  },
  async finish(eventId, o: Outcome) {
    const db = await admin();
    await db.from("provider_webhook_events").update({ status: o.status, error: o.error ?? null, order_id: o.orderId ?? null, processed_at: new Date().toISOString() }).eq("event_id", eventId);
  },
};

export const dbWebhookDeps: WebhookDeps = {
  async findOrder(refs: ParsedEvent["refs"]) {
    const db = await admin();
    let q = db.from("esims").select("order_id,provider_order_id,provider_esim_id,lpa_string,usage_alerts_sent,orders!inner(id,status,is_sandbox)").limit(1);
    if (refs.orderId) q = q.eq("provider_order_id", refs.orderId);
    else if (refs.esimId) q = q.eq("provider_esim_id", refs.esimId);
    else if (refs.iccid) q = q.eq("iccid", refs.iccid);
    else return null;
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const o = data.orders as unknown as { id: string; status: string; is_sandbox: boolean };
    return { id: o.id, status: o.status, isSandbox: o.is_sandbox, providerOrderId: data.provider_order_id, providerEsimId: data.provider_esim_id, hasInstallData: Boolean(data.lpa_string), alertsSent: data.usage_alerts_sent ?? [] };
  },
  async getOrder(id) {
    const { getProvider } = await import("./providers/index.server");
    const r = await getProvider().getOrder!(id);
    return { status: r.status, providerStatus: r.esim?.providerStatus, esim: r.esim };
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
  },
  async markFailed(orderId, code, reason) {
    const db = await admin();
    const err = `eSIMerge: ${code ?? "Fehler"}${reason ? ` – ${reason}` : ""}`.slice(0, 300);
    await db.from("orders").update({ status: "fulfillment_failed", last_error: err, next_attempt_at: null }).eq("id", orderId).neq("status", "fulfilled");
    await db.from("audit_log").insert({ action: "provider_order_failed", entity: "order", entity_id: orderId, meta: { code: code ?? null, reason: reason ?? null } });
    const { sendOrderEmail } = await import("./email.server");
    await sendOrderEmail(orderId, "failure");
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
