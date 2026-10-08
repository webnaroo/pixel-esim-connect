import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/brand";
import { blogPostQuery } from "@/lib/content.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(blogPostQuery(params.slug));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} | GlobeSIM Blog` : "Beitrag nicht gefunden | GlobeSIM";
    const desc = loaderData ? loaderData.body_md.replace(/[#*_>`]/g, "").slice(0, 155) : "Beitrag nicht gefunden.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
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
