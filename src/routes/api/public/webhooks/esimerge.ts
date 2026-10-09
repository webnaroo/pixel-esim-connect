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
        if (!guard.ok) return guard.response;
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
        const ctx = (globalThis as { __cfCtx?: { waitUntil(p: Promise<unknown>): void } }).__cfCtx;
        if (ctx) pending.forEach((p) => ctx.waitUntil(p));
        else if (pending.length) await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 20_000))]);
        return Response.json({ received: true, duplicate: result === "duplicate" });
      },
    },
  },
});
