import { createFileRoute } from "@tanstack/react-router";
import { pageUrl } from "@/lib/seo";
import { sitemapXml } from "@/lib/sitemap";

// Sitemap built from live data: only destinations with purchasable plans, published legal pages and blog posts.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Die Datenbank-Abfragen dauern mehrere Sekunden (Server und Datenbank liegen weit auseinander).
        // Erfolgreiche Antworten liegen deshalb eine Stunde im Cloudflare-Cache; Fehler (503) werden nie gespeichert.
        const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
        const cacheKey = new Request("https://globesim.de/sitemap.xml");
        try { const hit = await edge?.match(cacheKey); if (hit) return hit; } catch { /* ohne Cache weiter */ }
        try {
          const { loadSitemapPaths } = await import("@/lib/sitemap.server");
          const { paths } = await loadSitemapPaths();
          const res = new Response(sitemapXml(paths.map(pageUrl)), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600" } });
          try { await edge?.put(cacheKey, res.clone()); } catch { /* Cache nicht verfügbar */ }
          return res;
        } catch {
          console.error("Sitemap public data read failed");
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
        }
      },
    },
  },
});
