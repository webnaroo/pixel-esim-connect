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
        if (!providerSetupStatus().configured) return Response.json({ skipped: "provider_not_configured" });
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
            if (orderStatus === "fulfilling" && !r.lpa_string && hasInstallData(res.esim)) {
              await dbFulfillmentStore.markFulfilled(r.order_id, res.providerOrderId, res.esim);
              ready++;
            } else if (res.esim) {
              await db.from("esims").update({
                provider_status: res.esim.providerStatus ?? null,
                install_status: res.esim.installStatus ?? "waiting",
                expires_at: res.esim.expiresAt ?? null,
                ...(res.esim.providerStatus?.toLowerCase() === "expired" ? { status: "expired" } : {}),
              }).eq("order_id", r.order_id);
              refreshed++;
            }
          } catch {
            errors++;
          }
        }
        const { processPendingWebhookEvents } = await import("@/lib/esimerge-webhook.server");
        await processPendingWebhookEvents().catch(() => {});
        return Response.json({ checked: rows?.length ?? 0, ready, refreshed, errors });
      },
    },
  },
});
