import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Called by the scheduler with `Authorization: Bearer <LOVABLE_CRON_SECRET>`.
export const Route = createFileRoute("/api/public/cron/catalog-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, {
          name: "cron-catalog-sync",
          secretEnv: "LOVABLE_CRON_SECRET",
          auth: { kind: "bearer" },
          limit: { windowSeconds: 60, max: 3 },
        });
        if (!guard.ok) return guard.response;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: enabled } = await supabaseAdmin.from("app_settings").select("value").eq("key", "catalog_sync_enabled").maybeSingle();
        if (enabled?.value !== true) return Response.json({ status: "disabled" });

        const { runCatalogSync } = await import("@/lib/catalog-sync.server");
        const r = await runCatalogSync("cron");
        return Response.json({ status: r.status, added: r.added, updated: r.updated, deactivated: r.deactivated });
      },
    },
  },
});
