import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// eSIMerge webhooks: signature "t=<unix>,v1=<hex>" over "<t>.<raw body>" (5-min window), 503 without secret.
// Answers 200 right after storing; processing runs in the background and is retried by the status poll.
export const Route = createFileRoute("/api/public/webhooks/esimerge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, {
          name: "esimerge-webhook",
          secretEnv: "ESIMERGE_WEBHOOK_SECRET",
          auth: { kind: "esimerge" },
          limit: { windowSeconds: 60, max: 120 },
        });
        if (!guard.ok) {
          // Invalid signatures are only counted (api_logs), never stored with their payload.
          if (guard.response.status === 401) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("api_logs").insert({ provider: "esimerge-webhook", endpoint: "/api/public/webhooks/esimerge", status: 401, error: "invalid_signature" });
          }
          return guard.response;
        }
        const { parseEvent, receiveEvent } = await import("@/lib/esimerge-webhook");
        let raw: unknown;
        try { raw = JSON.parse(guard.rawBody); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
        const deliveryId = request.headers.get("x-esimerge-delivery");
        const ev = parseEvent(raw, deliveryId);
        if (!ev) return Response.json({ error: "invalid event" }, { status: 400 });
        const { providerSetupStatus } = await import("@/lib/providers/index.server");
        const mode = ev.mode ?? (providerSetupStatus().sandbox ? "sandbox" : "live");
        const { dbEventStore, dbWebhookDeps } = await import("@/lib/esimerge-webhook.server");
        const pending: Promise<void>[] = [];
        const result = await receiveEvent(dbEventStore, dbWebhookDeps, ev, raw, deliveryId, mode, (p) => pending.push(p.catch(() => {})));
        // Give processing at most 20 s (eSIMerge expects 2xx within 60 s); anything left is picked up by the status poll.
        if (pending.length) await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 20_000))]);
        return Response.json({ received: true, duplicate: result === "duplicate" });
      },
    },
  },
});
