import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Picks up paid orders whose retry is due. Called by the scheduled job with the server-only token from internal_secrets.
export const Route = createFileRoute("/api/public/cron/fulfillment-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-fulfillment-retry", secretDb: "cron", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { MAX_IN_PROGRESS_ATTEMPTS } = await import("@/lib/fulfillment");
        const { data: due } = await db
          .from("orders")
          .select("id")
          .in("status", ["paid", "fulfilling"])
          .lt("fulfillment_attempts", MAX_IN_PROGRESS_ATTEMPTS)
          .lte("next_attempt_at", new Date().toISOString())
          .limit(20);
        const { fulfillOrderById } = await import("@/lib/fulfillment.server");
        const outcomes = [];
        for (const o of due ?? []) outcomes.push(await fulfillOrderById(o.id));
        // Removes the scheduled job once no retries are pending (re-armed by the next scheduled retry).
        await db.rpc("disarm_fulfillment_retry_if_drained");
        return Response.json({ checked: outcomes.length, fulfilled: outcomes.filter((x) => x === "fulfilled").length });
      },
    },
  },
});
