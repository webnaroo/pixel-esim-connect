import { createFileRoute } from "@tanstack/react-router";
import { llmsTxt } from "@/lib/llms-txt";

// llms.txt aus Live-Daten: Firmenangaben aus company_info, Zahl der Reiseziele aus dem Katalog. Fehler werden nie zwischengespeichert.
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { publicDb } = await import("@/lib/public-db.server");
          const { parseCompanyInfo } = await import("@/lib/legal");
          const { loadSitemapPaths } = await import("@/lib/sitemap.server");
          // Dieselbe Zählung wie die Sitemap (vollständig paginiert). Ein einfaches Limit würde bei 13.000 Tarifen zu wenige Ziele zählen.
          const [{ data: info }, { paths }] = await Promise.all([
            publicDb().from("app_settings").select("value").eq("key", "company_info").maybeSingle(),
            loadSitemapPaths(),
          ]);
          const count = paths.filter((p) => p.startsWith("/countries/") || p.startsWith("/regions/")).length;
          return new Response(llmsTxt(parseCompanyInfo(info?.value), count || null), {
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600" },
          });
        } catch {
          console.error("llms.txt data read failed");
          return new Response("Temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
        }
      },
    },
  },
});
