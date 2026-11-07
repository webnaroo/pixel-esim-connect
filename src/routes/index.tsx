import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout";
import { ComparisonSection } from "@/components/comparison";
import { Hero } from "@/components/home/hero";
import { PopularDestinations } from "@/components/home/popular";
import { HowItWorks } from "@/components/home/how-it-works";
import { CompatibilitySection } from "@/components/home/compat-section";
import { HomeFaq } from "@/components/home/faq-section";
import { comparisonQuery } from "@/lib/comparison.functions";
import { destinationsQuery, faqsQuery, popularQuery } from "@/lib/catalog.functions";
import { pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(destinationsQuery()),
      context.queryClient.ensureQueryData(popularQuery()),
      context.queryClient.ensureQueryData(faqsQuery()),
      context.queryClient.ensureQueryData(comparisonQuery()),
    ]),
  head: () => ({
    meta: [
      { title: "GlobeSIM – Reise-eSIM für mobiles Internet im Ausland" },
      { name: "description", content: "Finde deine GlobeSIM Reise-eSIM: Tarife nach Reiseziel, Datenvolumen und Laufzeit vergleichen. Preise inkl. MwSt., eSIM-Kompatibilität und Installation prüfen." },
      { property: "og:title", content: "GlobeSIM – Reise-eSIM für mobiles Internet im Ausland" },
      { property: "og:description", content: "Vergleiche Reise-eSIMs für dein Reiseziel nach Datenvolumen, Laufzeit und Preis inkl. MwSt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...pageIdentity("/").meta,
    ],
    links: pageIdentity("/").links,
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <PopularDestinations />
      <HowItWorks />
      <ComparisonSection />
      <CompatibilitySection />
      <HomeFaq />
    </SiteLayout>
  );
}
