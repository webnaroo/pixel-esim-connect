import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/brand";
import { blogPostQuery } from "@/lib/content.functions";
import { breadcrumbScript, pageIdentity, pageUrl, textExcerpt } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(blogPostQuery(params.slug));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData, params }) => {
    const title = loaderData ? `${loaderData.title} | GlobeSIM Blog` : "Beitrag nicht gefunden | GlobeSIM";
    const desc = loaderData ? textExcerpt(loaderData.body_md) : "Beitrag nicht gefunden.";
    const path = `/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        ...pageIdentity(path).meta,
        ...(loaderData?.published_at ? [{ property: "article:published_time", content: loaderData.published_at }] : []),
        ...(loaderData ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ],
      links: pageIdentity(path).links,
      scripts: loaderData ? [
        breadcrumbScript([{ name: "Start", path: "/" }, { name: "Blog", path: "/blog" }, { name: loaderData.title, path }]),
        { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: loaderData.title, description: desc, mainEntityOfPage: pageUrl(path), url: pageUrl(path), ...(loaderData.published_at ? { datePublished: loaderData.published_at } : {}), publisher: { "@type": "Organization", name: "GlobeSIM", url: pageUrl("/") } }) },
      ] : [],
    };
  },
  notFoundComponent: () => (
    <SiteLayout><section className="container-page pt-10"><EmptyState title="Beitrag nicht gefunden"><Link to="/blog" className="text-primary underline">Zum Blog</Link></EmptyState></section></SiteLayout>
  ),
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(blogPostQuery(slug));
  if (!data) return null;
  return (
    <SiteLayout>
      <article className="container-page max-w-3xl pb-16 pt-10">
        <Link to="/blog" className="text-sm text-ink-muted hover:text-ink">← Blog</Link>
        <h1 className="mt-4">{data.title}</h1>
        {data.published_at && <p className="mt-2 text-xs text-ink-muted">{new Date(data.published_at).toLocaleDateString("de-DE")}</p>}
        <div className="mt-8"><Markdown text={data.body_md} /></div>
      </article>
    </SiteLayout>
  );
}
