import { createFileRoute, notFound } from "@tanstack/react-router";
import { destinationQuery } from "@/lib/catalog.functions";
import { SiteLayout } from "@/components/layout";
import { DestinationPage, DestinationPending, destinationHead } from "@/components/destination-page";

export const Route = createFileRoute("/regions/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(destinationQuery(params.slug));
    if (!d || d.type === "country") throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => destinationHead(loaderData, `/regions/${params.slug}`),
  pendingComponent: () => <SiteLayout><DestinationPending /></SiteLayout>,
  component: () => {
    const { slug } = Route.useParams();
    return <SiteLayout><DestinationPage slug={slug} /></SiteLayout>;
  },
});
