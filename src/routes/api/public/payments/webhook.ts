import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().max(100),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

// Lovable built-in payments webhook (?env=sandbox|live). Signature verified by the guard before anything else.
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ error: "invalid env" }, { status: 400 });
        const env = rawEnv;
        const guard = await guardPublicRoute(request, {
          name: "payments-webhook",
          secretEnv: env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET",
          auth: { kind: "stripe" },
          limit: { windowSeconds: 60, max: 120 },
        });
        if (!guard.ok) return guard.response;
        let ev: z.infer<typeof eventSchema>;
        try { ev = eventSchema.parse(JSON.parse(guard.rawBody)); } catch { return Response.json({ error: "invalid payload" }, { status: 400 }); }

        const { dbWebhookStore, fulfillOrderById, markWebhookProcessed, forgetWebhook } = await import("@/lib/fulfillment.server");
        const { processWebhookOnce } = await import("@/lib/fulfillment");
        const { decidePayment } = await import("@/lib/payment-events");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const eventKey = `${env}:${ev.id}`;
        const obj = ev.data.object as {
          id?: string; payment_intent?: string | null; payment_status?: string; amount_total?: number | null; currency?: string | null; metadata?: Record<string, string> | null;
        };

        try {
          const r = await processWebhookOnce(dbWebhookStore, "stripe", eventKey, async () => {
            if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
              const orderId = obj.metadata?.["order_id"];
              if (!orderId) return;
              const { data: order } = await db.from("orders").select("id,status,amount,currency,stripe_env,stripe_session_id").eq("id", orderId).maybeSingle();
              if (!order || (order.stripe_session_id && order.stripe_session_id !== obj.id)) return;
              const decision = decidePayment(
                { status: order.status, amount: Number(order.amount), currency: order.currency, stripeEnv: order.stripe_env },
                { amountTotal: obj.amount_total ?? null, currency: obj.currency ?? null, paymentStatus: ev.type === "checkout.session.async_payment_succeeded" ? "paid" : (obj.payment_status ?? "unpaid"), env },
              );
              if (decision.action === "mark_paid") {
                const { data: updated } = await db.from("orders")
                  .update({ status: "paid", stripe_payment_intent_id: obj.payment_intent ?? null })
                  .eq("id", orderId).eq("status", "pending").select("id");
                if (updated?.length) await fulfillOrderById(orderId);
              } else if (decision.action === "mismatch") {
                await db.from("orders").update({ status: "payment_mismatch", stripe_payment_intent_id: obj.payment_intent ?? null, last_error: decision.reason }).eq("id", orderId).eq("status", "pending");
                await db.from("audit_log").insert({ action: "payment_mismatch", entity: "order", entity_id: orderId, meta: { reason: decision.reason } });
              }
            } else if (ev.type === "checkout.session.async_payment_failed" || ev.type === "checkout.session.expired") {
              const orderId = obj.metadata?.["order_id"];
              if (orderId) await db.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
            } else if (ev.type === "charge.refunded" && obj.payment_intent) {
              await db.from("orders").update({ status: "refunded" }).eq("stripe_payment_intent_id", obj.payment_intent);
            } else if (ev.type === "charge.dispute.created" && obj.payment_intent) {
              // Dispute: mark the order and warn the admin with the deadline. No automatic action.
              const d = ev.data.object as { id?: string; reason?: string; amount?: number; evidence_details?: { due_by?: number | null } };
              const dueBy = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : null;
              const { data: hit } = await db.from("orders").update({ dispute_status: "open", dispute_id: d.id ?? null, dispute_due_by: dueBy }).eq("stripe_payment_intent_id", obj.payment_intent).select("id");
              await db.from("audit_log").insert({ action: "stripe_dispute", entity: "order", entity_id: hit?.[0]?.id ?? null, meta: { env, reason: d.reason ?? null, amount: d.amount ?? null, due_by: dueBy, message: `Rückbuchung/Streitfall${dueBy ? ` – Frist ${new Date(dueBy).toLocaleDateString("de-DE")}` : ""}` } });
            }
            // payment_intent.succeeded / payment_intent.payment_failed: acknowledged and recorded only;
            // the order status changes via checkout.session.* (it carries our order id).
          });
          if (r === "processed") await markWebhookProcessed("stripe", eventKey);
          return Response.json({ received: true, duplicate: r === "duplicate" });
        } catch {
          await forgetWebhook("stripe", eventKey);
          return Response.json({ error: "processing failed" }, { status: 500 });
        }
      },
    },
  },
});
