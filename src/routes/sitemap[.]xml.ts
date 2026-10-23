import { createFileRoute } from "@tanstack/react-router";
import { pageUrl } from "@/lib/seo";
import { sitemapXml } from "@/lib/sitemap";

// Sitemap built from live data: only destinations with purchasable plans, published legal pages and blog posts.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { loadSitemapPaths } = await import("@/lib/sitemap.server");
          const { paths } = await loadSitemapPaths();
          return new Response(sitemapXml(paths.map(pageUrl)), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=30, must-revalidate" } });
        } catch {
          console.error("Sitemap public data read failed");
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
        }
      },
    },
  },
});
