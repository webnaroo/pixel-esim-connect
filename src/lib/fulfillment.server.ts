// DB-backed implementation of the fulfillment store. Activation data is written here and never logged.
import { fulfillOrder, MAX_FULFILLMENT_ATTEMPTS, type FulfillmentStore, type FulfillOutcome, type WebhookEventStore } from "./fulfillment";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function audit(action: string, entityId: string, meta: Record<string, unknown> = {}) {
  const db = await admin();
  await db.from("audit_log").insert({ action, entity: "order", entity_id: entityId, meta: meta as never });
}

export const dbFulfillmentStore: FulfillmentStore = {
  async claim(orderId, maxAttempts) {
    const db = await admin();
    const { data, error } = await db.rpc("claim_order_for_fulfillment", { _order_id: orderId, _max_attempts: maxAttempts });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) return null;
    const snap = (row.plan_snapshot ?? {}) as { provider_plan_id?: string };
    if (!snap.provider_plan_id) return null;
    return { id: row.id, attempts: row.fulfillment_attempts, idempotencyKey: row.idempotency_key, providerPlanId: snap.provider_plan_id, email: row.guest_email };
  },
  async markFulfilled(orderId, providerOrderId, esim, amountUsd) {
    const db = await admin();
    const { data: order } = await db.from("orders").select("user_id").eq("id", orderId).single();
    if (amountUsd != null) await recordActualCost(orderId, amountUsd);
    const lpa = esim?.lpaString ?? (esim?.smdpAddress && esim.activationCode ? `LPA:1$${esim.smdpAddress}$${esim.activationCode}` : null);
    await db.from("esims").upsert(
      {
        order_id: orderId,
        user_id: order?.user_id ?? null,
        provider_order_id: providerOrderId,
        provider_esim_id: esim?.providerEsimId ?? null,
        provider_status: esim?.providerStatus ?? null,
        ios_install_url: esim?.iosInstallUrl ?? null,
        android_install_url: esim?.androidInstallUrl ?? null,
        iccid: esim?.iccid ?? null,
        smdp_address: esim?.smdpAddress ?? null,
        activation_code: esim?.activationCode ?? null,
        lpa_string: lpa,
        qr_image_url: esim?.qrImageUrl ?? null,
        direct_install_url: esim?.directInstallUrl ?? null,
        install_status: esim?.installStatus ?? "waiting",
        status: lpa ? "ready" : "pending",
        expires_at: esim?.expiresAt ?? null,
      },
      { onConflict: "order_id" },
    );
    // Without activation data the order stays 'fulfilling'; the status poll picks it up.
    await db.from("orders").update({ status: lpa ? "fulfilled" : "fulfilling", last_error: null }).eq("id", orderId);
    if (lpa) {
      const { sendOrderReadyEmail } = await import("./email.server");
      await sendOrderReadyEmail(orderId);
    }
  },
  async scheduleRetry(orderId, at, error) {
    const db = await admin();
    await db.from("orders").update({ status: "fulfilling", next_attempt_at: at.toISOString(), last_error: error }).eq("id", orderId);
  },
  async markNeedsReview(orderId, error) {
    const db = await admin();
    await db.from("orders").update({ status: "needs_review", next_attempt_at: null, last_error: error }).eq("id", orderId);
    await audit("fulfillment_needs_review", orderId, { reason: "provider_outcome_unknown" });
  },
  async markFailed(orderId, error) {
    const db = await admin();
    await db.from("orders").update({ status: "fulfillment_failed", last_error: error }).eq("id", orderId);
    await audit("fulfillment_failed", orderId, { attempts: MAX_FULFILLMENT_ATTEMPTS });
    const { sendOrderEmail } = await import("./email.server");
    await sendOrderEmail(orderId, "failure");
  },
};

export const dbWebhookStore: WebhookEventStore = {
  async record(source, eventId) {
    const db = await admin();
    const { data, error } = await db
      .from("webhook_events")
      .upsert({ source: source as "stripe" | "provider", event_id: eventId }, { onConflict: "source,event_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error("webhook_store_unavailable");
    return (data ?? []).length > 0;
  },
};

export async function markWebhookProcessed(source: "stripe" | "provider", eventId: string) {
  const db = await admin();
  await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("source", source).eq("event_id", eventId);
}

/** Removes the record so the provider's own retry can be processed after a handler crash. */
export async function forgetWebhook(source: "stripe" | "provider", eventId: string) {
  const db = await admin();
  await db.from("webhook_events").delete().eq("source", source).eq("event_id", eventId).is("processed_at", null);
}

export async function fulfillOrderById(orderId: string): Promise<FulfillOutcome> {
  const { getProvider } = await import("./providers/index.server");
  const provider = getProvider();
  const outcome = await fulfillOrder({ store: dbFulfillmentStore, createOrder: (i) => provider.createOrder(i) }, orderId);
  if (outcome === "fulfilled") await pollPendingInstallData(orderId);
  return outcome;
}

/** If the provider answered without installation data, poll briefly (5 s, max 3 min); then the cron job takes over. */
export async function pollPendingInstallData(orderId: string, opts: { maxMs?: number } = {}) {
  const db = await admin();
  const { data: e } = await db.from("esims").select("provider_order_id,lpa_string").eq("order_id", orderId).maybeSingle();
  if (!e?.provider_order_id || e.lpa_string) return;
  const { getProvider } = await import("./providers/index.server");
  const { pollUntilReady } = await import("./fulfillment");
  const { hasInstallData } = await import("./providers/esimerge/mapping");
  const p = getProvider();
  const res = await pollUntilReady(() => p.getOrder!(e.provider_order_id!), (r) => hasInstallData(r.esim), opts);
  if (res) await dbFulfillmentStore.markFulfilled(orderId, res.providerOrderId, res.esim, res.amountUsd);
}

/** Stores amount_usd as the real purchase price and warns (audit) when it differs from the catalog. Customer price is untouched. */
export async function recordActualCost(orderId: string, amountUsd: number) {
  const db = await admin();
  const { data: o } = await db.from("orders").select("plan_id,cost_amount").eq("id", orderId).maybeSingle();
  if (!o || (o.cost_amount != null && Number(o.cost_amount) === amountUsd)) return;
  await db.from("orders").update({ cost_amount: amountUsd, cost_currency: "USD" }).eq("id", orderId);
  if (!o.plan_id) return;
  const { data: p } = await db.from("plans").select("cost_price,cost_currency").eq("id", o.plan_id).maybeSingle();
  const { costDeviation } = await import("./esimerge-order");
  const warn = p && p.cost_currency.toUpperCase() === "USD" ? costDeviation(amountUsd, Number(p.cost_price)) : null;
  if (warn) await audit("cost_mismatch", orderId, { message: warn, actual_usd: amountUsd, catalog_usd: Number(p!.cost_price) });
}
