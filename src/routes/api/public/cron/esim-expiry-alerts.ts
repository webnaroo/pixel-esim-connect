import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Stündlich: eSIMs, deren Tarif in höchstens 48 Stunden endet, bekommen einmal eine Push-Mitteilung
// (nur angemeldete Kunden mit App). Die Zeitrechnung steht in src/lib/esim-expiry.ts.
export const Route = createFileRoute("/api/public/cron/esim-expiry-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-esim-expiry-alerts", secretDb: "cron", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { expiryAlertDue } = await import("@/lib/esim-expiry");
        const { notifyOrderPush } = await import("@/lib/push.server");
        const now = new Date();
        const { data: rows } = await db
          .from("esims")
          .select("order_id,activated_at,orders!inner(status,plan_snapshot)")
          .eq("status", "active")
          .is("expiry_alert_sent_at", null)
          .not("user_id", "is", null)
          .not("activated_at", "is", null)
          .gt("activated_at", new Date(now.getTime() - 400 * 86_400_000).toISOString())
          .limit(200);
        let due = 0, sent = 0;
        for (const r of rows ?? []) {
          const order = r.orders as unknown as { status: string; plan_snapshot: { validity_days?: number } | null };
          if (order.status !== "fulfilled") continue;
          const d = expiryAlertDue({ activatedAt: r.activated_at, validityDays: order.plan_snapshot?.validity_days, alreadySent: false, now });
          if (!d.due) continue;
          due++;
          const res = await notifyOrderPush(r.order_id, "esim_expiring", { daysLeft: d.daysLeft });
          // Ohne eingerichtetes Firebase bleibt die eSIM markierbar für später; sonst nie doppelt senden.
          if (!res.configured) continue;
          await db.from("esims").update({ expiry_alert_sent_at: now.toISOString() }).eq("order_id", r.order_id);
          sent += res.sent;
        }
        return Response.json({ checked: rows?.length ?? 0, due, sent });
      },
    },
  },
});
