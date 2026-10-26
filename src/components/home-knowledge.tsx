import { Link } from "@tanstack/react-router";

const DESTINATIONS: { to: string; label: string }[] = [
  { to: "/countries/turkey", label: "eSIM Türkei" },
  { to: "/countries/italy", label: "eSIM Italien (Rom)" },
  { to: "/countries/united-states", label: "eSIM USA (Miami)" },
  { to: "/countries/mexico", label: "eSIM Mexiko" },
  { to: "/countries/china", label: "eSIM China (Shanghai)" },
  { to: "/countries/south-africa", label: "eSIM Südafrika (Kapstadt)" },
  { to: "/countries/cape-verde", label: "eSIM Kapverdische Inseln" },
];

const link = "font-medium text-primary underline-offset-4 hover:underline";

/** Redaktioneller Text für die Startseite: nur allgemeine Erklärungen, keine Preise, Geschwindigkeits- oder Abdeckungsaussagen. */
export function HomeKnowledge() {
  return (
    <section className="container-page max-w-3xl py-10 sm:py-16" aria-labelledby="knowledge-h">
      <h2 id="knowledge-h">Was ist eine eSIM?</h2>
      <p className="mt-3 text-ink-muted">
        Eine eSIM (auch e-SIM oder „E SIM“ geschrieben) ist eine fest im Handy eingebaute SIM-Karte, die du digital einrichtest.
        Statt eine Plastikkarte zu wechseln, scannst du einen QR-Code und das Handy lädt das Datenpaket. Deine normale SIM bleibt für Anrufe und SMS aktiv.
        Eine Reise-eSIM von GlobeSIM ist ein Datenpaket für ein bestimmtes Reiseziel mit festem Datenvolumen und fester Laufzeit.
        Ob dein Handy eSIM unterstützt, prüfst du im <Link to="/device-compatibility" className={link}>Gerätecheck</Link>, die Schritte findest du unter <Link to="/how-it-works" className={link}>So funktioniert's</Link>.
      </p>

      <h2 className="mt-10">Mobile Daten im Ausland: eSIM statt Roaming</h2>
      <p className="mt-3 text-ink-muted">
        Im EU-Ausland nutzt du mobile Daten mit deinem deutschen Tarif meist zu den gleichen Konditionen wie zu Hause, bei manchen Tarifen mit Fair-Use-Grenze.
        Außerhalb der EU, zum Beispiel in der Türkei, den USA, Mexiko oder China, gelten oft andere Roaming-Konditionen, die je nach Tarif sehr unterschiedlich sind.
        Eine Reise-eSIM ist dann eine Alternative: Du kaufst vorab ein Datenpaket für dein Land und nutzt es parallel zu deiner Haupt-SIM.
        Schalte dafür Daten-Roaming der Haupt-SIM aus, damit darüber keine Daten laufen. Mehr dazu im <Link to="/ratgeber" className={link}>Ratgeber</Link>.
      </p>

      <h2 className="mt-10">eSIM oder Reise-WLAN-Router?</h2>
      <p className="mt-3 text-ink-muted">Beides bringt mobiles Internet ins Ausland, funktioniert aber unterschiedlich:</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-surface text-ink">
            <tr><th className="p-3 font-semibold">&nbsp;</th><th className="p-3 font-semibold">Reise-eSIM</th><th className="p-3 font-semibold">Mobiler WLAN-Router</th></tr>
          </thead>
          <tbody className="text-ink-muted">
            <tr className="border-t border-line"><th scope="row" className="p-3 font-medium text-ink">Zusätzliches Gerät</th><td className="p-3">Nein, sie läuft auf deinem Handy.</td><td className="p-3">Ja, ein Router, den du mitnimmst und lädst.</td></tr>
            <tr className="border-t border-line"><th scope="row" className="p-3 font-medium text-ink">Voraussetzung</th><td className="p-3">eSIM-fähiges Handy ohne SIM-Lock.</td><td className="p-3">Kaufen oder Mieten, je nach Anbieter.</td></tr>
            <tr className="border-t border-line"><th scope="row" className="p-3 font-medium text-ink">Mehrere Geräte</th><td className="p-3">Über Hotspot, wenn der Tarif es erlaubt (siehe Tarifbeschreibung).</td><td className="p-3">Der Router verbindet mehrere Geräte per WLAN.</td></tr>
            <tr className="border-t border-line"><th scope="row" className="p-3 font-medium text-ink">Einrichtung</th><td className="p-3">QR-Code scannen und Daten aktivieren.</td><td className="p-3">Router einschalten und verbinden.</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-10">Reise-eSIM für beliebte Ziele</h2>
      <p className="mt-3 text-ink-muted">Wähle dein Reiseland und vergleiche die Tarife nach Datenvolumen und Laufzeit:</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <li key={d.to}><Link to={d.to} className={link}>{d.label}</Link></li>
        ))}
      </ul>
      <p className="mt-4 text-ink-muted">Alle weiteren Länder und Regionen findest du bei den <Link to="/destinations" className={link}>Reisezielen</Link>.</p>
    </section>
  );
}
