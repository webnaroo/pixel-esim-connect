import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { RatgeberArticle } from "@/components/ratgeber-article";
import { EmptyState } from "@/components/brand";
import { CompatCheck } from "@/components/compat-check";
import { blogPostQuery } from "@/lib/content.functions";
import { destinationQuery } from "@/lib/catalog.functions";
import { formatData, formatDays, formatPrice } from "@/lib/format";
import { articleJsonLd, coverAbsUrl, faqJsonLd, parseFaq, parseSections, parseSources, planBlockState } from "@/lib/ratgeber";
import { breadcrumbScript, pageIdentity, textExcerpt } from "@/lib/seo";

export const Route = createFileRoute("/ratgeber/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(blogPostQuery(params.slug));
    if (!p) throw notFound();
    await Promise.all([...new Set(Object.values(p.destinations as Record<string, string>))].map((s) => context.queryClient.ensureQueryData(destinationQuery(s))));
    return p;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Beitrag nicht gefunden | GlobeSIM" }, { name: "robots", content: "noindex" }] };
    const path = `/ratgeber/${params.slug}`;
    const title = loaderData.meta_title || `${loaderData.title} | GlobeSIM`;
    const desc = loaderData.meta_description || textExcerpt(loaderData.answer_summary || loaderData.body_md);
    const img = coverAbsUrl(loaderData.cover_url);
    const faq = faqJsonLd(parseFaq(loaderData.faq));
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
        ...pageIdentity(path).meta,
        ...(loaderData.published_at ? [{ property: "article:published_time", content: loaderData.published_at }] : []),
        { property: "article:modified_time", content: loaderData.updated_at },
      ],
      links: pageIdentity(path).links,
      scripts: [
        breadcrumbScript([{ name: "Start", path: "/" }, { name: "Ratgeber", path: "/ratgeber" }, { name: loaderData.title, path }]),
        { type: "application/ld+json", children: JSON.stringify(articleJsonLd({ title: loaderData.title, description: desc, author: loaderData.author_name || "GlobeSIM", publishedAt: loaderData.published_at!, updatedAt: loaderData.updated_at, image: img }, path)) },
        ...(faq ? [{ type: "application/ld+json", children: JSON.stringify(faq) }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <SiteLayout><section className="container-page pt-10"><EmptyState title="Beitrag nicht gefunden"><Link to="/ratgeber" className="text-primary underline">Zum Ratgeber</Link></EmptyState></section></SiteLayout>
  ),
  component: Post,
});

function PlansBlock({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(destinationQuery(slug));
  const state = planBlockState(data?.plans, data?.fixturePlans);
  if (state === "preparing" || !data) return <div className="rounded-[14px] border border-line p-4 text-ink-muted">Tarife werden vorbereitet.</div>;
  const plans = [...data.plans].sort((a, b) => a.price - b.price);
  return (
    <div className="rounded-[14px] border border-primary p-3 sm:p-4">
      <p className="mb-3 text-sm text-ink-muted">Aktuelle Tarife für {data.name} (Bruttopreise inkl. MwSt.)</p>
      <ul className="divide-y divide-line">
        {plans.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{p.type === "unlimited" ? "Unlimited" : formatData(p.dataMb)} · {formatDays(p.validityDays)}</span>
            <span className="font-semibold">{formatPrice(p.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TariffCta({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(destinationQuery(slug));
  return <Link to="/countries/$slug" params={{ slug }} className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">{data?.name ?? "Länder"}-Tarife ansehen</Link>;
}

function Post() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(blogPostQuery(slug));
  if (!data) return null;
  const dSlug = data.destinationSlug;
  const map = data.destinations as Record<string, string>;
  const preparing = <div className="rounded-[14px] border border-line p-4 text-ink-muted">Tarife werden vorbereitet.</div>;
  return (
    <SiteLayout>
      <div className="container-page max-w-3xl pb-16 pt-10">
        <RatgeberArticle
          a={{ ...data, sections: parseSections(data.sections), faq: parseFaq(data.faq), sources: parseSources(data.sources) }}
          prices={(iso) => (map[iso] ? <PlansBlock slug={map[iso]!} /> : preparing)}
          sectionPrices={() => (dSlug ? <PlansBlock slug={dSlug} /> : preparing)}
          breadcrumb={<nav aria-label="Brotkrumen" className="text-sm text-ink-muted [overflow-wrap:anywhere]"><Link to="/" className="hover:text-ink">Start</Link> › <Link to="/ratgeber" className="hover:text-ink">Ratgeber</Link> › <span>{data.title}</span></nav>}
          cta={<>{dSlug && <TariffCta slug={dSlug} />}<CompatCheck /></>}
        />
      </div>
    </SiteLayout>
  );
}
