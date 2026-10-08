import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

export const Route = createFileRoute("/api/public/webhooks/esimerge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, {
          name: "esimerge-webhook",
          secretEnv: "ESIMERGE_WEBHOOK_SECRET",
          auth: { kind: "hmac-sha256", header: "x-esimerge-signature", prefix: "sha256=" }, // TODO(ESIMERGE): header name + scheme
          limit: { windowSeconds: 60, max: 120 },
        });
        if (!guard.ok) return guard.response;

        const { getProvider } = await import("@/lib/providers/index.server");
        let ev;
        try { ev = getProvider().parseWebhook(guard.rawBody); } catch { return Response.json({ error: "not configured" }, { status: 503 }); }

        const { dbWebhookStore, dbFulfillmentStore, markWebhookProcessed, forgetWebhook } = await import("@/lib/fulfillment.server");
        const { processWebhookOnce } = await import("@/lib/fulfillment");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        try {
          const r = await processWebhookOnce(dbWebhookStore, "provider", ev.eventId, async () => {
            if (!ev.providerOrderId) return;
            const { data: esim } = await db.from("esims").select("order_id,status").eq("provider_order_id", ev.providerOrderId).maybeSingle();
            if (!esim) return;
            if (ev.type === "esim.ready" && esim.status !== "ready") {
              const details = await getProvider().getEsim(ev.providerOrderId);
              await dbFulfillmentStore.markFulfilled(esim.order_id, ev.providerOrderId, details);
            } else if (ev.type === "esim.installed" || ev.type === "esim.activated") {
              await db.from("esims").update({ install_status: ev.type === "esim.installed" ? "installed" : "active" }).eq("order_id", esim.order_id);
            } else if (ev.type === "esim.expired") {
              await db.from("esims").update({ status: "expired" }).eq("order_id", esim.order_id);
            }
          });
          if (r === "processed") await markWebhookProcessed("provider", ev.eventId);
          return Response.json({ received: true, duplicate: r === "duplicate" });
        } catch {
          await forgetWebhook("provider", ev.eventId);
          return Response.json({ error: "processing failed" }, { status: 500 });
        }
      },
    },
  },
});
