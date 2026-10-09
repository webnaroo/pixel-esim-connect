import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { EmptyState } from "@/components/brand";
import { blogListQuery } from "@/lib/content.functions";
import { breadcrumbScript, pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/ratgeber/")({
  loader: ({ context }) => context.queryClient.ensureQueryData({ ...blogListQuery(), revalidateIfStale: true }),
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
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const countries = [...new Set(data.map((p) => p.country).filter(Boolean))] as string[];
  const names = new Intl.DisplayNames(["de"], { type: "region" });
  const list = data.filter((p) => (!country || p.country === country) && (!q.trim() || `${p.title} ${p.excerpt}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <SiteLayout>
      <section className="container-page pb-16 pt-10">
        <nav aria-label="Brotkrumen" className="text-sm text-ink-muted"><Link to="/" className="hover:text-ink">Start</Link> › <span>Ratgeber</span></nav>
        <h1 className="mt-4">Ratgeber</h1>
        {data.length === 0 ? (
          <div className="mt-8"><EmptyState title="Noch keine Beiträge" /></div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ratgeber durchsuchen" aria-label="Ratgeber durchsuchen" className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-base sm:text-sm" />
              {countries.length > 0 && (
                <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Nach Land filtern" className="h-11 rounded-full border border-line bg-surface px-4 text-sm">
                  <option value="">Alle Länder</option>
                  {countries.map((c) => <option key={c} value={c}>{names.of(c) ?? c}</option>)}
                </select>
              )}
            </div>
            {list.length === 0 ? <p className="mt-8 text-ink-muted">Keine Beiträge gefunden.</p> : (
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <li key={p.slug} className="min-w-0 overflow-hidden rounded-[14px] border border-line">
                    <Link to="/ratgeber/$slug" params={{ slug: p.slug }} className="block h-full hover:border-primary">
                      {p.cover && <img src={p.cover} alt={p.coverAlt ?? ""} className="aspect-[16/9] w-full object-cover" loading="lazy" width={800} height={450} />}
                      <div className="p-4">
                        <p className="text-lg font-semibold text-ink [overflow-wrap:anywhere]">{p.title}</p>
                        <p className="mt-1 text-xs text-ink-muted">Zuletzt aktualisiert: {new Date(p.updatedAt).toLocaleDateString("de-DE")}</p>
                        <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{p.excerpt}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </SiteLayout>
  );
}
