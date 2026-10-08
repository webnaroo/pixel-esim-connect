import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { EmptyState } from "@/components/brand";
import { blogListQuery } from "@/lib/content.functions";
import { pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery()),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Blog: Reisen mit eSIM | GlobeSIM" },
      { name: "description", content: "Tipps rund um eSIM, Reisen und mobiles Internet im Ausland vom GlobeSIM-Team." },
      { property: "og:title", content: "GlobeSIM Blog" },
      { property: "og:description", content: "Tipps rund um eSIM und Reisen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...pageIdentity("/blog").meta,
      ...(loaderData?.length ? [] : [{ name: "robots", content: "noindex, follow" }]),
    ],
    links: pageIdentity("/blog").links,
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data } = useSuspenseQuery(blogListQuery());
  return (
    <SiteLayout>
      <section className="container-page max-w-3xl pb-16 pt-10">
        <h1>Blog</h1>
        {data.length === 0 ? (
          <div className="mt-8"><EmptyState title="Noch keine Beiträge" /></div>
        ) : (
          <ul className="mt-8 divide-y divide-line">
            {data.map((p) => (
              <li key={p.slug} className="py-6">
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="text-xl font-semibold text-ink hover:text-primary">{p.title}</Link>
                <p className="mt-1 text-xs text-ink-muted">{new Date(p.publishedAt).toLocaleDateString("de-DE")}</p>
                <p className="mt-2 text-ink-muted">{p.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteLayout>
  );
}
