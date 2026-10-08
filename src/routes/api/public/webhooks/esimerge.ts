import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// eSIMerge documents no webhooks; status comes from the scheduled poll (/api/public/cron/esim-status-poll).
// The endpoint stays so the URL is reserved, and always answers 501.
export const Route = createFileRoute("/api/public/webhooks/esimerge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, {
          name: "esimerge-webhook",
          secretEnv: "ESIMERGE_WEBHOOK_SECRET",
          auth: { kind: "hmac-sha256", header: "x-esimerge-signature", prefix: "sha256=" },
          limit: { windowSeconds: 60, max: 30 },
        });
        if (!guard.ok) return guard.response;
        return Response.json({ error: "not_implemented", detail: "eSIMerge sendet keine Webhooks." }, { status: 501 });
      },
    },
  },
});
