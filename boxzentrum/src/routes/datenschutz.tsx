import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, Missing } from "@/components/legal-layout";
import { legal } from "@/content/legal";
import { site } from "@/content/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/datenschutz")({
  head: () => seo({ title: "Datenschutz", description: `Datenschutzerklärung des ${site.name}: keine Cookies, kein Tracking, Karte nur nach Klick.`, path: "/datenschutz" }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalLayout title="Datenschutz">
      <section>
        <p className="t-lead text-bone">Kurz gesagt: Diese Website setzt keine Cookies, nutzt kein Tracking und lädt nichts von Dritten, solange du es nicht selbst anklickst.</p>
      </section>
      <section>
        <h2>Verantwortliche Stelle</h2>
        {legal.entity ? <p>{legal.entity}</p> : <Missing>Vollständiger Name inklusive Rechtsform</Missing>}
        <p>
          {site.address.street}, {site.address.zip} {site.address.city}
          <br />
          Telefon: <a href={site.phone.href}>{site.phone.display}</a>, E-Mail: <a href={site.email.href}>{site.email.display}</a>
        </p>
      </section>
      <section>
        <h2>Hosting und Server-Logfiles</h2>
        {legal.hosting ? <p>Diese Website wird bereitgestellt von: {legal.hosting}.</p> : <Missing>Hosting-Anbieter mit Sitz</Missing>}
        <p>
          Beim Aufruf der Website verarbeitet der Server technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite, Browser und
          Betriebssystem. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt im sicheren und fehlerfreien Betrieb der Website.
          Sofern ein externer Anbieter eingesetzt wird, besteht mit diesem ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO.
        </p>
        {legal.logRetention ? <p>Die Logs werden nach {legal.logRetention} gelöscht.</p> : <Missing>Aufbewahrungsdauer der Server-Logs</Missing>}
      </section>
      <section>
        <h2>Cookies und Analyse</h2>
        <p>Diese Website verwendet keine Cookies und keine Analyse- oder Marketingdienste. Es gibt deshalb auch keinen Cookie-Banner.</p>
      </section>
      <section>
        <h2>Schriftarten und Bilder</h2>
        <p>Schriftarten und Bilder liegen auf unserem eigenen Server. Beim Laden der Seite wird keine Verbindung zu Google Fonts oder anderen Schriftanbietern aufgebaut.</p>
      </section>
      <section>
        <h2>Karte (OpenStreetMap)</h2>
        <p>
          Auf der Kontaktseite kannst du eine Karte von OpenStreetMap laden. Erst nach deinem Klick auf „Karte laden“ wird deine IP-Adresse an die Server der
          OpenStreetMap Foundation (St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Großbritannien) übertragen. Rechtsgrundlage ist deine
          Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO, die du durch den Klick erteilst. Mehr dazu:{" "}
          <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">
            Datenschutzerklärung der OpenStreetMap Foundation
          </a>
          .
        </p>
      </section>
      <section>
        <h2>Links zu Instagram, Facebook und Google</h2>
        <p>
          Wir binden keine Inhalte dieser Dienste ein, sondern verlinken nur auf sie. Erst wenn du einen Link anklickst, verlässt du unsere Website; dann gelten
          die Datenschutzbestimmungen des jeweiligen Anbieters.
        </p>
      </section>
      <section>
        <h2>Kontakt per Telefon oder E-Mail</h2>
        <p>
          Wenn du uns anrufst oder schreibst, verarbeiten wir deine Angaben, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b DSGVO). Die Funktion
          „Nachricht vorbereiten“ auf der Seite Probetraining öffnet lediglich dein eigenes E-Mail-Programm; auf unserer Website wird dabei nichts gespeichert oder
          übertragen.
        </p>
      </section>
      <section>
        <h2>Verschlüsselung</h2>
        <p>Die Verbindung zu dieser Website ist per TLS verschlüsselt. Das erkennst du am „https://“ in der Adresszeile.</p>
      </section>
      <section>
        <h2>Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen.
          Schreib dafür einfach an <a href={site.email.href}>{site.email.display}</a>.
        </p>
      </section>
      <section>
        <h2>Beschwerderecht</h2>
        <p>
          Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein
          (ULD), Holstenstraße 98, 24103 Kiel.
        </p>
      </section>
    </LegalLayout>
  );
}
