import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout";
import { LinkButton } from "@/components/ui-kit";
import { CompatCheck } from "@/components/compat-check";
import { ArrowDown, Laptop, MapTrifold, Stack, DownloadSimple, Compass, DeviceMobile, GlobeHemisphereWest, Lightning, QrCode, ArrowsDownUp, Receipt, ShieldCheck } from "@phosphor-icons/react";
import { pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "eSIM installieren: Anleitung für iPhone & Android | GlobeSIM" },
      { name: "description", content: "So installierst du deine GlobeSIM eSIM: Reiseziel wählen, bezahlen, QR-Code scannen. Anleitung für iPhone und Android." },
      { property: "og:title", content: "So funktioniert GlobeSIM" },
      { property: "og:description", content: "Reiseziel wählen, bezahlen, QR-Code scannen." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      ...pageIdentity("/how-it-works").meta,
    ],
    links: pageIdentity("/how-it-works").links,
    scripts: [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "HowTo", name: "GlobeSIM eSIM installieren und nutzen",
      step: [
        { "@type": "HowToStep", name: "Reiseziel wählen", text: "Suche dein Reiseziel und vergleiche Datenvolumen, Laufzeit und Preis inkl. MwSt." },
        { "@type": "HowToStep", name: "Bezahlen", text: "Bestelle als Gast oder mit deinem GlobeSIM-Konto." },
        { "@type": "HowToStep", name: "Installieren", text: "Öffne die Mobilfunk-Einstellungen, wähle eSIM hinzufügen und scanne den QR-Code. Alternativ gib SM-DP+-Adresse und Aktivierungscode manuell ein." },
        { "@type": "HowToStep", name: "Am Reiseziel einschalten", text: "Wähle die GlobeSIM-eSIM für mobile Daten und aktiviere Datenroaming für diese eSIM." },
      ],
    }) }],
  }),
  component: HowItWorks,
});

const JUMPS = [
  { id: "erste-schritte", label: "Erste Schritte" },
  { id: "was-ist-esim", label: "Was ist eine eSIM?" },
  { id: "warum-globesim", label: "Warum GlobeSIM?" },
  { id: "installieren", label: "So installierst du sie" },
];

function HowItWorks() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="container-page pt-10 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl leading-[1.05] lg:text-6xl">So funktioniert GlobeSIM</h1>
            <p className="mt-6 max-w-lg text-lg text-ink-muted">Erfahre, was eine eSIM ist, wie du sie in wenigen Minuten einrichtest und warum du damit im Ausland entspannt online bleibst.</p>
          </div>
          <ImageSlot icon={<GlobeHemisphereWest size={96} weight="duotone" aria-hidden />} label="Bild folgt" className="min-h-64" tone="mint" />
        </div>
        <nav aria-label="Auf dieser Seite" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {JUMPS.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-primary">
              {j.label}<ArrowDown size={18} aria-hidden />
            </a>
          ))}
        </nav>
      </section>

      {/* Erste Schritte */}
      <section id="erste-schritte" className="container-page mt-16 scroll-mt-24">
        <div className="rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground lg:px-12">
          <h2 className="text-center text-3xl lg:text-4xl">Erste Schritte mit GlobeSIM</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Bubble icon={<Compass size={28} aria-hidden />}>Wähle dein Reiseziel und vergleiche Datenvolumen, Laufzeit und Preis inkl. MwSt.</Bubble>
            <Bubble icon={<ArrowsDownUp size={28} aria-hidden />}>Bezahle als Gast oder mit deinem Konto. Danach bekommst du deine eSIM sofort.</Bubble>
            <Bubble icon={<DeviceMobile size={28} aria-hidden />}>Du brauchst ein Gerät, das eSIMs unterstützt und nicht an einen Anbieter gebunden ist.</Bubble>
            <Bubble icon={<QrCode size={28} aria-hidden />}>Scanne den QR-Code oder gib die Daten manuell ein. Fertig.</Bubble>
          </ul>
        </div>
      </section>


      {/* So verwendest du */}
      <section className="container-page mt-16">
        <h2 className="text-3xl lg:text-4xl">So verwendest du GlobeSIM</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <UseCard icon={<MapTrifold size={24} aria-hidden />} tone="bg-mint/30" title="Ein Reiseziel auswählen">Suche dein Land oder eine ganze Region. Bei Reisen durch mehrere Länder lohnt sich oft ein Regionstarif.</UseCard>
          <UseCard icon={<Stack size={24} aria-hidden />} tone="bg-primary/15" title="Ein Paket auswählen">Jedes Paket hat ein festes Datenvolumen, das für eine bestimmte Zeit gilt. Den Preis siehst du inkl. MwSt.</UseCard>
          <UseCard icon={<DownloadSimple size={24} aria-hidden />} tone="bg-[oklch(0.86_0.09_60)]" title="Installieren und verbinden">Wenn du bereit bist, installierst du deine eSIM. Das dauert nur wenige Minuten und braucht eine Internetverbindung.</UseCard>
        </ul>
      </section>

      {/* Was ist eine eSIM */}
      <section id="was-ist-esim" className="container-page mt-16 scroll-mt-24">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-line bg-surface p-6 shadow-sm lg:p-10">
          <h2 className="text-3xl lg:text-4xl">Was ist eine eSIM?</h2>
          <p className="mt-3 text-lg font-semibold text-ink">Sie funktioniert wie eine normale SIM-Karte, nur digital.</p>
          <div className="mt-4 border-b border-line" />
          <div className="mt-6 grid items-start gap-8 md:grid-cols-[200px_1fr]">
            <ImageSlot icon={<DeviceMobile size={72} weight="duotone" aria-hidden />} label="Bild folgt" className="min-h-44" tone="sand" />
            <div className="space-y-4 text-ink-muted">
              <p>Eine eSIM ist eine digitale SIM-Karte, die fest in dein Gerät eingebaut ist. Statt eine kleine Plastikkarte zu tauschen, lädst du dein Datenpaket einfach per QR-Code aufs Handy. So verbindet sich dein Gerät am Reiseziel mit einem lokalen Mobilfunknetz.</p>
              <p>Deine normale SIM bleibt dabei aktiv. Anrufe und SMS erreichen dich weiter unter deiner Nummer.</p>
            </div>
          </div>
          <h3 className="mt-10 text-xl">Gerätekompatibilität</h3>
          <p className="mt-3 text-ink-muted">Damit du eine GlobeSIM nutzen kannst, muss dein Gerät diese Bedingungen erfüllen:</p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-muted">
            <li>Das Gerät unterstützt eSIMs.</li>
            <li>Das Gerät ist nicht an einen bestimmten Anbieter oder ein bestimmtes Netz gebunden (kein SIM-Lock).</li>
            <li>Das Gerät ist nicht gejailbreakt (iOS) oder gerootet (Android).</li>
          </ul>
          <p className="mt-4 text-sm text-ink-muted">Einige regionale Modelle unterstützen keine eSIMs. Im Zweifel hilft der Hersteller deines Geräts.</p>
          <CompatCheck className="mt-6" />
        </div>
      </section>

      {/* Warum GlobeSIM */}
      <section id="warum-globesim" className="container-page mt-20 scroll-mt-24 space-y-20">
        <Feature icon={<DeviceMobile size={88} weight="duotone" aria-hidden />} tone="mint" title="Was sind die Vorteile von eSIMs?" sub="Flexibel, bequem und schnell eingerichtet">
          Du kaufst und installierst eine eSIM in wenigen Minuten. Du brauchst dafür nur eine Internetverbindung, keine Plastikkarte und keinen Gang in den Laden.
        </Feature>
        <Feature flip icon={<Laptop size={88} weight="duotone" aria-hidden />} tone="sand" title="Was brauche ich für eine eSIM?" sub="Ein Gerät, das eSIMs unterstützt">
          Viele Smartphones und Tablets unterstützen eSIMs, teils auch Laptops und Smartwatches. Wichtig ist, dass dein Gerät nicht an einen bestimmten Anbieter oder ein bestimmtes Netz gebunden ist.
        </Feature>
        <Feature flip icon={<GlobeHemisphereWest size={88} weight="duotone" aria-hidden />} tone="mint" title="Bleib im Ausland in Verbindung" sub="Mobile Daten ab der Landung">
          Mit GlobeSIM nutzt du am Reiseziel lokale Mobilfunknetze. Karten, Nachrichten und Tickets funktionieren, ohne dass du nach WLAN suchst.
        </Feature>
        <Feature flip icon={<Receipt size={88} weight="duotone" aria-hidden />} tone="sand" title="Weniger Roaming-Ärger" sub="Du weißt vorher, was es kostet">
          Du wählst ein Paket mit festem Preis inkl. MwSt. Es gibt keinen Vertrag und keine Überraschung auf der nächsten Handyrechnung.
        </Feature>
        <Feature icon={<Lightning size={88} weight="duotone" aria-hidden />} tone="mint" title="Sofort startklar" sub="Kein Warten auf eine Karte">
          Nach der Zahlung bekommst du die eSIM direkt per E-Mail und in deinem Konto. Du kannst sie schon zu Hause einrichten und am Reiseziel einschalten.
        </Feature>
        <Feature flip icon={<ShieldCheck size={88} weight="duotone" aria-hidden />} tone="sand" title="Guthaben bei jedem Kauf" sub="GlobeMoney">
          Bei jedem Kauf sammelst du GlobeMoney und steigst Stufe für Stufe auf. Das Guthaben kannst du bei deiner nächsten Bestellung einsetzen.
        </Feature>
      </section>

      {/* Gerätekompatibilität */}
      <section id="kompatibilitaet" className="container-page mt-20 scroll-mt-24">
        <div className="rounded-[2rem] bg-mint/20 px-6 py-12 lg:px-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl lg:text-4xl">Gerätekompatibilität</h2>
              <p className="mt-4 text-lg font-semibold text-ink">Jedes GlobeSIM-Paket ist eine eSIM.</p>
              <p className="mt-3 text-ink-muted">Dein Gerät muss eSIMs unterstützen und darf keine Netzbetreiber-Sperre haben. Prüfe das am besten vor dem Kauf.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <CompatCheck />
                <LinkButton to="/device-compatibility" variant="secondary">Alle Geräte anzeigen</LinkButton>
              </div>
            </div>
            <ImageSlot icon={<ShieldCheck size={80} weight="duotone" aria-hidden />} label="Bild folgt" tone="sand" className="min-h-52" />
          </div>
        </div>
      </section>

      {/* Installieren */}
      <section id="installieren" className="container-page mt-20 max-w-3xl scroll-mt-24">
        <h2 className="text-3xl">So installierst du deine eSIM</h2>
        <ol className="mt-8 space-y-10">
          <Step n={1} t="Reiseziel wählen">Gib dein Reiseziel in die Suche ein. Du siehst alle Tarife mit Datenvolumen, Laufzeit und Preis inkl. MwSt. Für Reisen durch mehrere Länder lohnt sich oft ein Regionstarif.</Step>
          <Step n={2} t="Bezahlen">Du kannst als Gast oder mit Konto bestellen. Nach der Zahlung erhältst du die eSIM sofort per E-Mail und findest sie in deinem Konto.</Step>
          <Step n={3} t="Installieren">
            <strong className="text-ink">iPhone:</strong> Einstellungen › Mobilfunk › eSIM hinzufügen › QR-Code verwenden. <br />
            <strong className="text-ink">Android:</strong> Einstellungen › Verbindungen › SIM-Manager › eSIM hinzufügen.<br />
            Alternativ kannst du die Daten (SM-DP+-Adresse und Aktivierungscode) manuell eingeben.
          </Step>
          <Step n={4} t="Am Reiseziel einschalten">Wähle die GlobeSIM-eSIM für mobile Daten und aktiviere Datenroaming für diese eSIM. Deine normale SIM bleibt für Anrufe und SMS aktiv.</Step>
        </ol>
        <p className="mt-10 text-sm text-ink-muted">Wichtig: Installiere jede eSIM nur auf einem Gerät und lösche sie nicht, solange du sie noch nutzen willst.</p>
        <div className="mt-8 pb-20"><LinkButton to="/destinations">Reiseziel wählen</LinkButton></div>
      </section>
    </SiteLayout>
  );
}

/** Platzhalter für Illustrationen. Eigenes Bild später über `src` einsetzen (Pfad aus /public). */
function ImageSlot({ icon, label, className = "", tone, src }: { icon: React.ReactNode; label: string; className?: string; tone: "mint" | "sand"; src?: string }) {
  if (src) return <img src={src} alt="" loading="lazy" className={`w-full rounded-3xl object-cover ${className}`} />;
  return (
    <div aria-hidden className={`grid place-items-center rounded-3xl text-primary ${tone === "mint" ? "bg-mint/25" : "bg-[oklch(0.93_0.04_80)]"} ${className}`}>
      <div className="flex flex-col items-center gap-2">{icon}<span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span></div>
    </div>
  );
}

function UseCard({ icon, tone, title, children }: { icon: React.ReactNode; tone: string; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <span className={`grid size-12 place-items-center rounded-full text-ink ${tone}`}>{icon}</span>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</p>
    </li>
  );
}

function Bubble({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-4 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-surface text-primary">{icon}</span>
      <p className="text-sm leading-relaxed">{children}</p>
    </li>
  );
}

function Feature({ icon, tone, title, sub, flip, children }: { icon: React.ReactNode; tone: "mint" | "sand"; title: string; sub: string; flip?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <h2 className="text-3xl lg:text-4xl">{title}</h2>
        <h3 className="mt-4 text-lg font-semibold">{sub}</h3>
        <p className="mt-3 text-ink-muted">{children}</p>
      </div>
      <ImageSlot icon={icon} label="Bild folgt" tone={tone} className={`min-h-56 ${flip ? "md:order-1" : ""}`} />
    </div>
  );
}

function Step({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-5">
      <span className="tabular font-display text-3xl font-semibold leading-none text-primary">{n}</span>
      <div>
        <h3 className="text-xl lg:text-2xl">{t}</h3>
        <p className="mt-2 text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
