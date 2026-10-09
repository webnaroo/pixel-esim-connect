import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Fallback to webhooks: every 5 minutes the scheduled job checks orders still waiting for
// installation data and refreshes the status of eSIMs that are not expired. Activation data is never logged.
export const Route = createFileRoute("/api/public/cron/esim-status-poll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-esim-status-poll", secretDb: "cron", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { providerSetupStatus, getProvider } = await import("@/lib/providers/index.server");
        // Automatic refunds (switch "Automatische Erstattung", default off) — independent of provider config.
        const { runDbAutoRefunds } = await import("@/lib/auto-refund.server");
        const refunds = await runDbAutoRefunds().catch(() => ({ refunded: [], skipped: 0, errors: 1 }));
        if (!providerSetupStatus().configured) return Response.json({ skipped: "provider_not_configured", refunds });
        const { dbFulfillmentStore } = await import("@/lib/fulfillment.server");
        const { hasInstallData } = await import("@/lib/providers/esimerge/mapping");
        const provider = getProvider();

        const { data: rows } = await db
          .from("esims")
          .select("order_id,provider_order_id,lpa_string,provider_status,status,orders!inner(status)")
          .not("provider_order_id", "is", null)
          .neq("status", "expired")
          .limit(50);
        let ready = 0, refreshed = 0, errors = 0;
        for (const r of rows ?? []) {
          try {
            const res = await provider.getOrder!(r.provider_order_id!);
            const orderStatus = (r.orders as unknown as { status: string }).status;
            const { dbWebhookDeps } = await import("@/lib/esimerge-webhook.server");
            if (res.orderStatus === "failed" && orderStatus !== "fulfilled" && orderStatus !== "fulfillment_failed") {
              await dbWebhookDeps.markFailed(r.order_id, res.errorCode);
            } else if (res.orderStatus === "cancelled" && orderStatus !== "cancelled") {
              await dbWebhookDeps.markCancelled(r.order_id);
            } else if (orderStatus === "fulfilling" && !r.lpa_string && hasInstallData(res.esim)) {
              await dbFulfillmentStore.markFulfilled(r.order_id, res.providerOrderId, res.esim, res.amountUsd);
              ready++;
            } else if (res.esim) {
              await db.from("esims").update({
                provider_status: res.esim.providerStatus ?? null,
                install_status: res.esim.installStatus ?? "waiting",
                expires_at: res.esim.expiresAt ?? null,
                ...(res.orderStatus === "expired" || res.esim.providerStatus?.toLowerCase() === "expired" ? { status: "expired" } : {}),
                ...(res.orderStatus === "active" ? { status: "active", ...(res.activatedAt ? { activated_at: res.activatedAt } : {}) } : {}),
              }).eq("order_id", r.order_id);
              refreshed++;
            }
          } catch (e) {
            errors++;
            // not_found on an order read: admin hint only, no status change.
            const info = (e as { info?: { code: string | null; requestId: string | null; httpStatus: number | null } }).info;
            if (info && (info.code === "not_found" || info.httpStatus === 404)) {
              await db.from("audit_log").insert({ action: "provider_error", entity: "order", entity_id: r.order_id, meta: { code: "not_found", request_id: info.requestId, message: "Bestellung bei eSIMerge nicht gefunden – keine Statusänderung" } });
            }
          }
        }
        const { processPendingWebhookEvents } = await import("@/lib/esimerge-webhook.server");
        await processPendingWebhookEvents().catch(() => {});
        return Response.json({ checked: rows?.length ?? 0, ready, refreshed, errors });
      },
    },
  },
});
