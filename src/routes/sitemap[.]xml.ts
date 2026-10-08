import { createFileRoute } from "@tanstack/react-router";
import { pageUrl } from "@/lib/seo";
import { readAllPages, sitemapXml } from "@/lib/sitemap";

// Sitemap built from live data: only destinations with purchasable plans, published legal pages and blog posts.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { publicDb } = await import("@/lib/public-db.server");
        const db = publicDb();
        try {
          const [plans, legal, posts, destinations] = await Promise.all([
            readAllPages((from, to) => db.from("public_plans").select("id,destination_id").order("id").range(from, to)),
            readAllPages((from, to) => db.from("legal_pages").select("slug").eq("published", true).order("slug").range(from, to)),
            readAllPages((from, to) => db.from("blog_posts").select("slug").in("status", ["published", "scheduled"]).not("published_at", "is", null).lte("published_at", new Date().toISOString()).order("slug").range(from, to)),
            readAllPages((from, to) => db.from("destinations").select("id,slug,type").eq("is_active", true).order("id").range(from, to)),
          ]);
          const ids = new Set(plans.map((p) => p.destination_id));
          const dest = destinations.filter((d) => ids.has(d.id)).map((d) => d.type === "country" ? `/countries/${d.slug}` : `/regions/${d.slug}`);
          const paths = ["/", "/destinations", "/how-it-works", "/faq", "/help", ...(posts.length ? ["/ratgeber"] : []), ...dest, ...legal.map((l) => `/legal/${l.slug}`), ...posts.map((p) => `/ratgeber/${p.slug}`)];
          return new Response(sitemapXml(paths.map(pageUrl)), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
        } catch {
          console.error("Sitemap public data read failed");
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
        }
      },
    },
  },
});
