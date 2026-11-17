import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, Missing } from "@/components/legal-layout";
import { legal } from "@/content/legal";
import { site } from "@/content/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/impressum")({
  head: () => seo({ title: "Impressum", description: `Impressum des ${site.name}, ${site.address.street}, ${site.address.zip} ${site.address.city}.`, path: "/impressum" }),
  component: Imprint,
});

function Imprint() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        {legal.entity ? <p>{legal.entity}</p> : <Missing>Vollständiger Name inklusive Rechtsform (z. B. „… e. V.“)</Missing>}
        <p>
          {site.address.street}
          <br />
          {site.address.zip} {site.address.city}
          <br />
          Deutschland
        </p>
      </section>
      <section>
        <h2>Vertreten durch</h2>
        {legal.representatives ? <p>{legal.representatives}</p> : <Missing>Vor- und Nachname der vertretungsberechtigten Person(en)</Missing>}
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href={site.phone.href}>{site.phone.display}</a>
          <br />
          E-Mail: <a href={site.email.href}>{site.email.display}</a>
        </p>
      </section>
      {legal.register && (
        <section>
          <h2>Registereintrag</h2>
          <p>{legal.register}</p>
        </section>
      )}
      {legal.vatId && (
        <section>
          <h2>Umsatzsteuer-Identifikationsnummer</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: {legal.vatId}</p>
        </section>
      )}
      <section>
        <h2>Redaktionell verantwortlich nach § 18 Abs. 2 MStV</h2>
        {legal.editor ? (
          <p>
            {legal.editor}, {site.address.street}, {site.address.zip} {site.address.city}
          </p>
        ) : (
          <Missing>Name der redaktionell verantwortlichen Person</Missing>
        )}
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>
      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet,
          übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
          diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender
          Rechtsverletzungen entfernen wir diese Inhalte umgehend.
        </p>
      </section>
      <section>
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte
          auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Bei
          Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.
        </p>
      </section>
      <section>
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
          Autors bzw. Erstellers. Kartendaten auf der Kontaktseite stammen von OpenStreetMap und stehen unter der Open Database License (ODbL),
          © OpenStreetMap-Mitwirkende.
        </p>
      </section>
    </LegalLayout>
  );
}
