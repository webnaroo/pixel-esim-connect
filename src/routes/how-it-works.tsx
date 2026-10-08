import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout";
import { LinkButton } from "@/components/ui-kit";
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
  }),
  component: () => (
    <SiteLayout>
      <article className="container-page max-w-3xl pt-10">
        <h1>So funktioniert's</h1>
        <ol className="mt-10 space-y-10">
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
        <div className="mt-8"><LinkButton to="/destinations">Reiseziel wählen</LinkButton></div>
      </article>
    </SiteLayout>
  ),
});

function Step({ n, t, children }: { n: number; t: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-5">
      <span className="tabular font-display text-3xl font-semibold leading-none text-primary">{n}</span>
      <div>
        <h2 className="text-xl lg:text-2xl">{t}</h2>
        <p className="mt-2 text-ink-muted">{children}</p>
      </div>
    </li>
  );
}
