import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { EmptyState } from "@/components/brand";
import { blogListQuery } from "@/lib/content.functions";
import { breadcrumbScript, pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/ratgeber/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery()),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Ratgeber: eSIM auf Reisen | GlobeSIM" },
      { name: "description", content: "Ratgeber zu eSIM, mobilem Internet im Ausland, Einrichtung und Datenbedarf für deine Reiseziele." },
      { property: "og:title", content: "GlobeSIM Ratgeber" },
      { property: "og:description", content: "Praktische Anleitungen rund um eSIM und Reisen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...pageIdentity("/ratgeber").meta,
      ...(loaderData?.length ? [] : [{ name: "robots", content: "noindex, follow" }]),
    ],
    links: pageIdentity("/ratgeber").links,
    scripts: [breadcrumbScript([{ name: "Start", path: "/" }, { name: "Ratgeber", path: "/ratgeber" }])],
  }),
  component: RatgeberIndex,
});

function RatgeberIndex() {
  const { data } = useSuspenseQuery(blogListQuery());
  return (
    <SiteLayout>
      <section className="container-page max-w-3xl pb-16 pt-10">
        <nav aria-label="Brotkrumen" className="text-sm text-ink-muted"><Link to="/" className="hover:text-ink">Start</Link> › <span>Ratgeber</span></nav>
        <h1 className="mt-4">Ratgeber</h1>
        {data.length === 0 ? (
          <div className="mt-8"><EmptyState title="Noch keine Beiträge" /></div>
        ) : (
          <ul className="mt-8 divide-y divide-line">
            {data.map((p) => (
              <li key={p.slug} className="py-6">
                <Link to="/ratgeber/$slug" params={{ slug: p.slug }} className="text-xl font-semibold text-ink hover:text-primary">{p.title}</Link>
                <p className="mt-1 text-xs text-ink-muted">Zuletzt aktualisiert: {new Date(p.updatedAt).toLocaleDateString("de-DE")}</p>
                <p className="mt-2 text-ink-muted">{p.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteLayout>
  );
}
