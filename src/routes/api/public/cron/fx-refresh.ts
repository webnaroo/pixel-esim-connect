import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Every 6 h via pg_cron with the server-only token from internal_secrets. Without a valid token: 401.
export const Route = createFileRoute("/api/public/cron/fx-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-fx-refresh", secretDb: "cron", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { refreshRates } = await import("@/lib/fx.server");
        const r = await refreshRates("cron");
        return Response.json(r.ok ? { ok: true, source: r.source, publishedAt: r.publishedAt, stored: r.stored.length } : { ok: false, warning: r.warning });
      },
    },
  },
});
