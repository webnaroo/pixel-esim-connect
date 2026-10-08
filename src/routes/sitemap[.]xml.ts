import { createFileRoute } from "@tanstack/react-router";
import { publicDb } from "@/lib/public-db.server";

// Sitemap built from live data: only destinations with purchasable plans, published legal pages and blog posts.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const db = publicDb();
        const [{ data: plans }, { data: legal }, { data: posts }] = await Promise.all([
          db.from("public_plans").select("destination_id"),
          db.from("legal_pages").select("slug").eq("published", true),
          db.from("blog_posts").select("slug").not("published_at", "is", null).lte("published_at", new Date().toISOString()),
        ]);
        const ids = [...new Set((plans ?? []).map((p) => p.destination_id).filter((x): x is string => !!x))];
        const { data: dests } = ids.length ? await db.from("destinations").select("slug,type").in("id", ids) : { data: [] as { slug: string; type: string }[] };
        const dest = new Set<string>();
        for (const d of dests ?? []) dest.add(d.type === "country" ? `/countries/${d.slug}` : `/regions/${d.slug}`);
        const paths = ["/", "/destinations", "/how-it-works", "/faq", "/help", ...(posts?.length ? ["/blog"] : []), ...dest, ...(legal ?? []).map((l) => `/legal/${l.slug}`), ...(posts ?? []).map((p) => `/blog/${p.slug}`)];
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${esc(origin + p)}</loc></url>`).join("\n")}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
