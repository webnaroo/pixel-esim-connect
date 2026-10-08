import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().max(100),
  data: z.object({ object: z.object({ id: z.string().optional(), payment_intent: z.string().nullish(), metadata: z.record(z.string(), z.string()).nullish() }).passthrough() }),
});

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "stripe-webhook", secretEnv: "STRIPE_WEBHOOK_SECRET", auth: { kind: "stripe" }, limit: { windowSeconds: 60, max: 120 } });
        if (!guard.ok) return guard.response;
        let parsed;
        try { parsed = eventSchema.parse(JSON.parse(guard.rawBody)); } catch { return Response.json({ error: "invalid payload" }, { status: 400 }); }
        const ev = parsed;

        const { dbWebhookStore, fulfillOrderById, markWebhookProcessed, forgetWebhook } = await import("@/lib/fulfillment.server");
        const { processWebhookOnce } = await import("@/lib/fulfillment");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        try {
          const r = await processWebhookOnce(dbWebhookStore, "stripe", ev.id, async () => {
            const obj = ev.data.object;
            const orderId = obj.metadata?.["order_id"];
            if (ev.type === "payment_intent.succeeded" && orderId) {
              // Only pending -> paid; repeated or late events change nothing.
              await db.from("orders").update({ status: "paid", stripe_payment_intent_id: obj.id ?? null }).eq("id", orderId).eq("status", "pending");
              await fulfillOrderById(orderId);
            } else if (ev.type === "charge.refunded" && obj.payment_intent) {
              await db.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent_id", obj.payment_intent);
            }
          });
          if (r === "processed") await markWebhookProcessed("stripe", ev.id);
          return Response.json({ received: true, duplicate: r === "duplicate" });
        } catch {
          await forgetWebhook("stripe", ev.id);
          return Response.json({ error: "processing failed" }, { status: 500 });
        }
      },
    },
  },
});
