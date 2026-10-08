import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/layout";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { getLegalPreview, legalPageQuery } from "@/lib/content.functions";
import { pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/legal/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(legalPageQuery(params.slug)),
  head: ({ loaderData, params }) => {
    const title = loaderData ? `${loaderData.title} | GlobeSIM` : "Seite nicht gefunden | GlobeSIM";
    const desc = loaderData ? `${loaderData.title} von GlobeSIM.` : "Diese Seite ist nicht verfügbar.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...pageIdentity(`/legal/${params.slug}`).meta,
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: pageIdentity(`/legal/${params.slug}`).links,
    };
  },
  component: LegalPage,
});

function LegalPage() {
  const { slug } = Route.useParams();
  const { data: pub } = useSuspenseQuery(legalPageQuery(slug));
  const { user } = useAuth();
  const previewFn = useServerFn(getLegalPreview);
  const preview = useQuery({ queryKey: ["legal-preview", slug, user?.id], queryFn: () => previewFn({ data: { slug } }), enabled: !pub && !!user, retry: false });
  const page = pub ?? preview.data ?? null;
  return (
    <SiteLayout>
      <section className="container-page max-w-3xl pb-16 pt-10 [overflow-wrap:anywhere]">
        {!page ? (
          <EmptyState title="Seite nicht gefunden">
            <Link to="/" className="text-primary underline">Zur Startseite</Link>
          </EmptyState>
        ) : (
          <>
            {!page.published && (
              <div role="alert" className="mb-6 rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4 text-sm font-medium">
                Platzhalter, nicht veröffentlichen. Nur Admins sehen diese Seite. Freigabe unter Admin › Inhalte.
              </div>
            )}
            {page.missing.length > 0 && (
              <p className="mb-6 text-sm text-ink-muted">Fehlende Firmendaten: {page.missing.join(", ")}</p>
            )}
            <h1 className="max-sm:text-[28px] max-sm:leading-8">{page.title}</h1>
            <div className="mt-8"><Markdown text={page.text} /></div>
            <p className="mt-10 text-xs text-ink-muted">Stand: {new Date(page.updatedAt).toLocaleDateString("de-DE")}</p>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
