import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";

// Täglich: meldet Seiten an IndexNow (Bing, Yandex u. a.). Beim ersten Lauf alle Seiten der Sitemap,
// danach nur Ratgeber-Beiträge, die in den letzten 26 Stunden geändert wurden. Google nutzt IndexNow nicht.
export const Route = createFileRoute("/api/public/cron/indexnow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, { name: "cron-indexnow", secretDb: "cron", auth: { kind: "bearer" }, limit: { windowSeconds: 60, max: 3 } });
        if (!guard.ok) return guard.response;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { pageUrl } = await import("@/lib/seo");
        const { INDEXNOW_ENDPOINT, indexNowAccepted, indexNowPayload } = await import("@/lib/indexnow");

        const { data: state } = await db.from("app_settings").select("value").eq("key", "indexnow_state").maybeSingle();
        const initialized = Boolean((state?.value as { initialized_at?: string } | null)?.initialized_at);
        const { loadChangedPostPaths, loadSitemapPaths } = await import("@/lib/sitemap.server");
        let paths: string[];
        try {
          // Erster Lauf: alle Seiten. Danach nur Beiträge der letzten 26 Stunden (eine kleine Abfrage statt der ganzen Sitemap).
          paths = initialized ? await loadChangedPostPaths(new Date(Date.now() - 26 * 3_600_000).toISOString()) : (await loadSitemapPaths()).paths;
        } catch { return Response.json({ ok: false, reason: "sitemap_unavailable" }, { status: 503 }); }
        const urls = paths.map(pageUrl);
        if (!urls.length) return Response.json({ ok: true, submitted: 0 });

        const payload = indexNowPayload(urls);
        const res = await fetch(INDEXNOW_ENDPOINT, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(payload) });
        if (!indexNowAccepted(res.status)) return Response.json({ ok: false, status: res.status, submitted: 0 }, { status: 502 });
        if (!initialized) await db.from("app_settings").upsert({ key: "indexnow_state", value: { initialized_at: new Date().toISOString(), first_count: payload.urlList.length }, updated_at: new Date().toISOString() });
        return Response.json({ ok: true, status: res.status, submitted: payload.urlList.length, initial: !initialized });
      },
    },
  },
});
