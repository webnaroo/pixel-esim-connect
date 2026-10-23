import { readAllPages } from "./sitemap";

/** Alle indexierbaren Pfade: Sitemap und IndexNow benutzen genau dieselbe Liste. Wirft, wenn eine Quelle ausfällt. */
export async function loadSitemapPaths(): Promise<{ paths: string[]; posts: { slug: string; updated_at: string }[] }> {
  const { publicDb } = await import("./public-db.server");
  const db = publicDb();
  const [plans, legal, posts, destinations] = await Promise.all([
    readAllPages((from, to) => db.from("public_plans").select("id,destination_id").order("id").range(from, to)),
    readAllPages((from, to) => db.from("legal_pages").select("slug").eq("published", true).order("slug").range(from, to)),
    readAllPages((from, to) => db.from("blog_posts").select("slug,updated_at").in("status", ["published", "scheduled"]).not("published_at", "is", null).lte("published_at", new Date().toISOString()).order("slug").range(from, to)),
    readAllPages((from, to) => db.from("destinations").select("id,slug,type").eq("is_active", true).order("id").range(from, to)),
  ]);
  const ids = new Set(plans.map((p) => p.destination_id));
  const dest = destinations.filter((d) => ids.has(d.id)).map((d) => (d.type === "country" ? `/countries/${d.slug}` : `/regions/${d.slug}`));
  const paths = ["/", "/destinations", "/how-it-works", "/faq", "/help", ...(posts.length ? ["/ratgeber"] : []), ...dest, ...legal.map((l) => `/legal/${l.slug}`), ...posts.map((p) => `/ratgeber/${p.slug}`)];
  return { paths, posts: posts.map((p) => ({ slug: p.slug, updated_at: p.updated_at })) };
}

/** Ratgeber-Pfade, die seit `sinceIso` geändert wurden (für den täglichen IndexNow-Lauf; eine kleine Abfrage). */
export async function loadChangedPostPaths(sinceIso: string): Promise<string[]> {
  const { publicDb } = await import("./public-db.server");
  const db = publicDb();
  const rows = await readAllPages((from, to) => db.from("blog_posts").select("slug").in("status", ["published", "scheduled"]).not("published_at", "is", null).lte("published_at", new Date().toISOString()).gte("updated_at", sinceIso).order("slug").range(from, to));
  return rows.map((r) => `/ratgeber/${r.slug}`);
}
