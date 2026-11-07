import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CompatCheck } from "@/components/compat-check";
import { LinkButton } from "@/components/ui-kit";
import { faqsQuery } from "@/lib/catalog.functions";
import { isCompatFaq } from "@/lib/faq-rules";
import { Section } from "./section";

export function HomeFaq() {
  const { data: faqs = [] } = useSuspenseQuery(faqsQuery());
  return (
    <>
      {faqs.length > 0 && (
        <Section labelledBy="faq-h" className="max-w-3xl">
          <h2 id="faq-h">Häufige Fragen</h2>
          <Accordion type="single" collapsible className="reveal mt-8 rounded-lg border border-line bg-surface px-5 sm:px-6 [&>*:last-child]:border-b-0">
            {faqs.slice(0, 6).map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="min-h-14 py-4 text-left text-base font-medium hover:no-underline [&>svg]:ml-4">{f.question}</AccordionTrigger>
                <AccordionContent className="text-base text-ink-muted">{f.answer}{isCompatFaq(f.question) && <CompatCheck hint className="mt-4" />}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Link to="/faq" className="mt-6 inline-flex min-h-10 items-center gap-1 font-medium text-primary underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-(--dur-hover) ease-ui-out hover:decoration-current">
            Alle Fragen <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </Section>
      )}
      <ClosingCta />
    </>
  );
}

/** Closing conversion block right above the footer. Same copy as the former FAQ lead-in. */
function ClosingCta() {
  return (
    <Section labelledBy="cta-h" className="pb-0 pt-0 sm:pb-0 sm:pt-0">
      <div className="reveal flex flex-col items-start gap-5 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 id="cta-h" className="text-2xl lg:text-[28px] lg:leading-9">eSIM für dein nächstes Reiseland</h2>
        </div>
        <LinkButton to="/destinations" size="lg" className="w-full sm:w-auto">
          Reiseziele ansehen
          <ArrowRight size={18} weight="bold" aria-hidden />
        </LinkButton>
      </div>
    </Section>
  );
}
