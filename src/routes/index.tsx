import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DeviceMobile, CaretRight } from "@phosphor-icons/react";
import { Flag } from "@/components/brand";
import { formatPrice } from "@/lib/format";
import destinationPhotos from "@/assets/mobile-destinations.jpg";
import { SiteLayout } from "@/components/layout";
import { ComparisonSection } from "@/components/comparison";
import { NoThrottleClaim } from "@/components/unlimited-claim";
import { SearchBox } from "@/components/search-box";
import { DestinationRow, DestinationRowSkeleton } from "@/components/catalog";
import { SegmentedControl, LinkButton } from "@/components/ui-kit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { comparisonQuery } from "@/lib/comparison.functions";
import { destinationsQuery, faqsQuery, popularQuery } from "@/lib/catalog.functions";
import { CompatCheck } from "@/components/compat-check";
import { isCompatFaq } from "@/lib/faq-rules";
import airportBanner from "@/assets/home-airport.jpg";
import mobileAirportBanner from "@/assets/home-airport-mobile.jpg";
import speedIcon from "@/assets/speed.png";
import wifiIcon from "@/assets/wifi.png";
import shieldIcon from "@/assets/shield.png";
import worldIcon from "@/assets/world.png";
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
    { icon: speedIcon, title: "Sofort per E-Mail", detail: "Digital statt per Post" },
    { icon: wifiIcon, title: "Lokale Tarife", detail: "Für dein Reiseziel" },
    { icon: shieldIcon, title: "Sicher bezahlen", detail: "SSL-verschlüsselt" },
  ];
  return (
    <section className="home-hero relative isolate" aria-labelledby="home-title">
      <picture className="home-hero-image">
        <source media="(max-width: 1023px)" srcSet={mobileAirportBanner} />
        <img src={airportBanner} alt="Reisende am Flughafen mit Smartphone und GlobeSIM Reise-eSIM" width={1920} height={960} fetchPriority="high" />
      </picture>
      <div className="container-page relative z-10">
        <div className="home-hero-copy pb-6 pt-5 lg:py-14">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary lg:mb-4">
            <img src={speedIcon} alt="" className="size-6 object-contain" aria-hidden />
            GlobeSIM · Deine Reise-eSIM
          </p>
          <h1 id="home-title" className="!tracking-normal"><span className="sm:hidden">Online, sobald<br />du landest.</span><span className="hidden sm:inline">GlobeSIM Reise-eSIM</span></h1>
          <p className="home-hero-description mt-3 max-w-lg text-base text-ink-muted lg:mt-4 lg:text-lg"><span className="sm:hidden">eSIM für deine Reise. Einfach kaufen, installieren und weltweit verbunden bleiben.</span><span className="hidden sm:inline">eSIM kaufen, in Minuten installieren, ohne Roaming-Überraschung. Bleibe weltweit verbunden – einfach und schnell.</span></p>
          <div className="mt-5 lg:mt-7" data-hero-search>
            <SearchBox />
            <span className="home-search-hint pointer-events-none absolute text-xs" aria-hidden>Land oder Region suchen</span>
            <CaretRight className="home-search-arrow pointer-events-none absolute" size={20} aria-hidden />
          </div>
          <ul className="mt-5 grid grid-cols-3 gap-2 lg:mt-6 lg:gap-3" aria-label="Deine Vorteile">
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
          <div className="home-world-benefit mt-5 flex items-center gap-3 border-t border-line pt-4 lg:mt-7">
            <img src={worldIcon} alt="" aria-hidden className="size-9 shrink-0 object-contain" />
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
    <section className="home-popular container-page py-12 lg:py-16" aria-labelledby="popular-h">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:hidden">
        <h2 className="min-w-0 text-lg">Beliebte Reiseziele</h2>
        <Link to="/destinations" className="flex shrink-0 items-center text-xs font-medium text-mobile-action">Alle anzeigen <CaretRight size={14} aria-hidden /></Link>
      </div>
      <div className="mb-6 hidden sm:flex sm:items-end sm:justify-between sm:gap-5">
        <h2 id="popular-h">Beliebte Reiseziele</h2>
        <SegmentedControl label="Art des Reiseziels" value={tab} onChange={setTab} options={[{ value: "country", label: "Länder" }, { value: "region", label: "Regionen" }, { value: "global", label: "Global" }]} />
      </div>
      <div className={`grid grid-cols-4 gap-2 sm:gap-4 ${tab !== "country" ? "sm:hidden" : ""}`}>
        {["turkey", "united-states", "thailand", "japan"].map((slug) => bySlug.get(slug)).filter((d) => d && d.type === "country").map((d) => {
          if (!d) return null;
          const photo = ({ turkey: "turkey", turkei: "turkey", "tuerkei": "turkey", "united-states": "usa", usa: "usa", thailand: "thailand", japan: "japan" } as Record<string, string>)[d.slug];
          return <Link key={d.id} to="/countries/$slug" params={{ slug: d.slug }} className="home-destination-tile min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
            <div className={`home-destination-photo ${photo ? `home-photo-${photo}` : "home-photo-fallback"}`}>
              {photo ? <img src={destinationPhotos} alt="" loading="lazy" width={1600} height={800} /> : <Flag code={d.flagCode} size={32} />}
            </div>
            <div className="px-2 pb-2 pt-1 sm:p-4"><Flag code={d.flagCode} size={18} /><p className="mt-1 truncate text-xs font-semibold sm:mt-2 sm:text-base">{d.slug === "united-states" ? "USA" : d.name}</p>{d.fromPrice != null && <p className="mt-1 text-[10px] tabular sm:text-sm">ab {formatPrice(d.fromPrice)}</p>}</div>
          </Link>;
        })}
      </div>
      <div className="hidden sm:block">
      {tab !== "country" && (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {list.length ? list.map((d) => <DestinationRow key={d.id} d={d} />) : [0, 1, 2, 3].map((i) => <DestinationRowSkeleton key={i} />)}
      </div>
      )}
      <div className="mt-6">
        <LinkButton to="/destinations" variant="secondary">Alle Reiseziele</LinkButton>
      </div>
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
      <div className="container-page grid gap-8 py-10 sm:gap-12 sm:py-16 lg:grid-cols-2 lg:items-center lg:py-24">
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
          <CompatCheck className="mt-5" />
        </div>
      </div>
    </section>
  );
}

function HomeFaq() {
  const { data: faqs = [] } = useSuspenseQuery(faqsQuery());
  if (!faqs.length) return null;
  return (
    <section className="container-page max-w-3xl py-10 sm:py-16 lg:py-24" aria-labelledby="faq-h">
      <div className="flex flex-wrap items-center gap-4">
        <LinkButton to="/destinations" variant="secondary">Reiseziele ansehen</LinkButton>
        <span className="text-sm text-ink-muted">eSIM für dein nächstes Reiseland</span>
      </div>
      <h2 id="faq-h" className="mt-6">Häufige Fragen</h2>
      <Accordion type="single" collapsible className="mt-6">
        {faqs.slice(0, 6).map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-left text-base">{f.question}</AccordionTrigger>
            <AccordionContent className="text-ink-muted">{f.answer}{isCompatFaq(f.question) && <CompatCheck hint className="mt-4" />}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Link to="/faq" className="mt-6 inline-block font-medium text-primary underline-offset-4 hover:underline">Alle Fragen</Link>
    </section>
  );
}
