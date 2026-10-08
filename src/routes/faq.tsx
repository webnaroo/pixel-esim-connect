import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqsQuery } from "@/lib/catalog.functions";
import { pageIdentity } from "@/lib/seo";
import { CompatCheck } from "@/components/compat-check";
import { isCompatFaq } from "@/lib/faq-rules";

export const Route = createFileRoute("/faq")({
  loader: ({ context }) => context.queryClient.ensureQueryData(faqsQuery()),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Häufige Fragen zur eSIM | GlobeSIM" },
      { name: "description", content: "Antworten auf häufige Fragen zu eSIM, Kompatibilität, Installation, Datenvolumen und Erstattung bei GlobeSIM." },
      { property: "og:title", content: "FAQ | GlobeSIM" },
      { property: "og:description", content: "Häufige Fragen zur eSIM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      ...pageIdentity("/faq").meta,
    ],
    links: pageIdentity("/faq").links,
    scripts: loaderData?.length
      ? [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: loaderData.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }) }]
      : [],
  }),
  component: Faq,
});

function Faq() {
  const { data } = useSuspenseQuery(faqsQuery());
  return (
    <SiteLayout>
      <section className="container-page max-w-3xl pt-10">
        <h1>Häufige Fragen</h1>
        <Accordion type="single" collapsible className="mt-8">
          {data.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left text-base">{f.question}</AccordionTrigger>
              <AccordionContent className="text-ink-muted">{f.answer}{isCompatFaq(f.question) && <CompatCheck hint className="mt-4" />}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SiteLayout>
  );
}
