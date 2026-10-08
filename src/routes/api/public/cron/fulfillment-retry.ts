import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Picks up paid orders whose retry is due. Called with `Authorization: Bearer <LOVABLE_CRON_SECRET>`.
export const Route = createFileRoute("/api/public/cron/fulfillment-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-fulfillment-retry", secretEnv: "LOVABLE_CRON_SECRET", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { MAX_FULFILLMENT_ATTEMPTS } = await import("@/lib/fulfillment");
        const { data: due } = await db
          .from("orders")
          .select("id")
          .eq("status", "paid")
          .lt("fulfillment_attempts", MAX_FULFILLMENT_ATTEMPTS)
          .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
          .limit(20);
        const { fulfillOrderById } = await import("@/lib/fulfillment.server");
        const outcomes = [];
        for (const o of due ?? []) outcomes.push(await fulfillOrderById(o.id));
        return Response.json({ checked: outcomes.length, fulfilled: outcomes.filter((x) => x === "fulfilled").length });
      },
    },
  },
});
