import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DeviceMobile } from "@phosphor-icons/react";
import { SiteLayout } from "@/components/layout";
import { ComparisonSection } from "@/components/comparison";
import { NoThrottleClaim } from "@/components/unlimited-claim";
import { SearchBox } from "@/components/search-box";
import { DestinationRow, DestinationRowSkeleton } from "@/components/catalog";
import { SegmentedControl, LinkButton } from "@/components/ui-kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { comparisonQuery } from "@/lib/comparison.functions";
import { destinationsQuery, faqsQuery, popularQuery } from "@/lib/catalog.functions";
import airportBanner from "@/assets/home-airport.jpg";
import speedIcon from "@/assets/speed.png.asset.json";
import wifiIcon from "@/assets/wifi.png.asset.json";
import shieldIcon from "@/assets/shield.png.asset.json";
import worldIcon from "@/assets/world.png.asset.json";

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
      { title: "GlobeSIM – eSIM für deine Reise. Online, sobald du landest." },
      { name: "description", content: "Entdecke GlobeSIM Reise-eSIMs für dein Reiseziel. Einfach installieren und ohne Roaming-Überraschung verbunden bleiben – deine SIM bleibt aktiv." },
      { property: "og:title", content: "GlobeSIM – Online, sobald du landest." },
      { property: "og:description", content: "eSIM kaufen, in Minuten installieren, ohne Roaming-Überraschung." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <Popular />
      <HowItWorks />
      <ComparisonSection />
      <Compatibility />
      <HomeFaq />
    </SiteLayout>
  );
}

function Hero() {
  const benefits = [
    { icon: speedIcon.url, title: "Sofort per E-Mail", detail: "Digital statt per Post" },
    { icon: wifiIcon.url, title: "Lokale Tarife", detail: "Für dein Reiseziel" },
    { icon: shieldIcon.url, title: "Sicher bezahlen", detail: "SSL-verschlüsselt" },
  ];
  return (
    <section className="home-hero relative isolate" aria-labelledby="home-title">
      <img src={airportBanner} alt="Reisende am Flughafen mit Smartphone und GlobeSIM Reise-eSIM" fetchPriority="high" className="home-hero-image" />
      <div className="container-page relative z-10">
        <div className="home-hero-copy pb-7 pt-8 lg:py-14">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
            <img src={speedIcon.url} alt="" className="size-6 object-contain" aria-hidden />
            GlobeSIM · Deine Reise-eSIM
          </p>
          <h1 id="home-title" className="!tracking-normal">Online, sobald du landest.</h1>
          <p className="mt-4 max-w-lg text-lg text-ink-muted">eSIM kaufen, in Minuten installieren, ohne Roaming-Überraschung. Bleibe weltweit verbunden – einfach und schnell.</p>
          <div className="mt-7" data-hero-search>
            <SearchBox />
          </div>
          <ul className="mt-6 grid grid-cols-3 gap-2 lg:gap-3" aria-label="Deine Vorteile">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex min-w-0 flex-col items-center gap-2 text-center lg:flex-row lg:items-start lg:text-left">
                <img src={benefit.icon} alt="" aria-hidden loading="eager" className="size-8 shrink-0 object-contain" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-5">{benefit.title}</p>
                  <p className="text-xs leading-5 text-ink-muted">{benefit.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex items-center gap-3 border-t border-line pt-4">
            <img src={worldIcon.url} alt="" aria-hidden className="size-9 shrink-0 object-contain" />
            <div>
              <p className="text-sm font-medium">Weltweit verbunden</p>
              <p className="text-xs text-ink-muted">Deine SIM bleibt aktiv · Preise inkl. MwSt.<NoThrottleClaim className="before:content-['_·_']" /></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Popular() {
  const { data: all } = useSuspenseQuery(destinationsQuery());
  const { data: popular } = useSuspenseQuery(popularQuery());
  const [tab, setTab] = useState<"country" | "region" | "global">("country");
  const bySlug = new Map(all.map((d) => [d.slug, d]));
  const list =
    tab === "country"
      ? (popular.map((s) => bySlug.get(s)).filter(Boolean) as typeof all).slice(0, 8)
      : all.filter((d) => d.type === tab).slice(0, 8);

  return (
    <section className="container-page py-12 lg:py-16" aria-labelledby="popular-h">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="popular-h">Beliebte Reiseziele</h2>
        <SegmentedControl label="Art des Reiseziels" value={tab} onChange={setTab} options={[{ value: "country", label: "Länder" }, { value: "region", label: "Regionen" }, { value: "global", label: "Global" }]} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {list.length ? list.map((d) => <DestinationRow key={d.id} d={d} />) : [0, 1, 2, 3].map((i) => <DestinationRowSkeleton key={i} />)}
      </div>
      <div className="mt-6">
        <LinkButton to="/destinations" variant="secondary">Alle Reiseziele</LinkButton>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { t: "Reiseziel wählen", d: "Suche dein Land oder deine Region und wähle ein Datenpaket oder Unlimited." },
    { t: "Bezahlen", d: "Mit Karte, Apple Pay oder Google Pay. Die eSIM kommt sofort per E-Mail." },
    { t: "QR-Code scannen", d: "Einmal installieren, am Reiseziel einschalten, online sein." },
  ];
  return (
    <section className="border-y border-line bg-surface" aria-labelledby="how-h">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <h2 id="how-h">So funktioniert's</h2>
          <ol className="mt-8 space-y-6">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-5">
                <span className="tabular font-display text-3xl font-semibold leading-none text-primary">{i + 1}</span>
                <div>
                  <h3 className="text-lg lg:text-xl">{s.t}</h3>
                  <p className="mt-1 text-ink-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link to="/how-it-works" className="mt-8 inline-block font-medium text-primary underline-offset-4 hover:underline">Ausführliche Anleitung</Link>
        </div>
        <PhoneMockup />
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto w-[260px] rounded-[40px] border border-line-strong bg-paper p-3" aria-hidden>
      <div className="rounded-[30px] border border-line bg-surface px-5 pb-8 pt-6">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-line" />
        <div className="mt-6 font-display text-lg font-semibold tracking-[-0.02em]">
          <span>Globe</span><span className="text-primary">SIM</span>
        </div>
        <div className="mt-5 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Meine eSIM</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2 py-0.5 text-xs">
              <span className="size-1.5 rounded-full bg-mint" /> Aktiv
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 w-2/5 rounded-full bg-primary" /></div>
          <div className="mt-2 flex justify-between text-xs text-ink-muted"><span>Verbrauch</span><span>Restlaufzeit</span></div>
        </div>
        <div className="mt-3 rounded-lg border border-line p-4 text-xs text-ink-muted">Installiert · Datenroaming an</div>
      </div>
    </div>
  );
}

function Compatibility() {
  return (
    <section className="container-page" aria-labelledby="compat-h">
      <div className="grid gap-8 rounded-xl border border-line bg-surface p-6 lg:grid-cols-[auto_1fr] lg:p-10">
        <DeviceMobile size={32} className="text-primary" aria-hidden />
        <div>
          <h2 id="compat-h">Ist mein Gerät eSIM-fähig?</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg">iPhone</h3>
              <p className="mt-1 text-ink-muted">Einstellungen › Mobilfunk. Siehst du „eSIM hinzufügen“ oder „Mobilfunktarif hinzufügen“, ist dein iPhone eSIM-fähig.</p>
            </div>
            <div>
              <h3 className="text-lg">Android</h3>
              <p className="mt-1 text-ink-muted">Einstellungen › Verbindungen › SIM-Manager (Samsung) bzw. Netzwerk & Internet › SIMs (Pixel). Gibt es „eSIM hinzufügen“, passt es.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-ink-muted">Wichtig: Das Gerät darf keine Netzsperre (SIM-Lock) haben. Schnellcheck: Wähle *#06# – wird eine EID angezeigt, unterstützt dein Gerät eSIM.</p>
        </div>
      </div>
    </section>
  );
}

function HomeFaq() {
  const { data: faqs = [] } = useSuspenseQuery(faqsQuery());
  if (!faqs.length) return null;
  return (
    <section className="container-page max-w-3xl py-16 lg:py-24" aria-labelledby="faq-h">
      <h2 id="faq-h">Häufige Fragen</h2>
      <Accordion type="single" collapsible className="mt-6">
        {faqs.slice(0, 6).map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-left text-base">{f.question}</AccordionTrigger>
            <AccordionContent className="text-ink-muted">{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Link to="/faq" className="mt-6 inline-block font-medium text-primary underline-offset-4 hover:underline">Alle Fragen</Link>
    </section>
  );
}
