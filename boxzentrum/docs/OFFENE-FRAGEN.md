# Offene Fragen an das BoxZentrum (vor Veröffentlichung klären)

Grundsatz: Auf der Website steht nur, was auf der aktuellen Website
(https://boxzentrum.kif-server.de/, Stand 17.11.2026) belegt ist. Alles andere ist hier gesammelt.

## Nicht prüfbare Quellen

- **Bisherige Website boxzentrum-kiel.de**: Der Server antwortet mit „423 Locked“, und das Webarchiv ist
  von hier aus nicht erreichbar. Kursnamen, Zeiten und Trainer von dort konnten nicht abgeglichen werden.
- **Instagram (@boxzentrum_kiel, @coach_arton)**: Abruf durch Instagram blockiert (429). Keine Inhalte,
  Fotos oder Erfolge von dort übernommen.

## Pflichtangaben (blockieren den Livegang – `npm run check:launch`)

In `src/content/legal.ts` eintragen:

1. Vollständiger Name inklusive Rechtsform (die Website spricht von „unserem Verein“, also vermutlich ein e. V.)
2. Vertretungsberechtigte Person(en), z. B. Vorstand
3. Registergericht und Registernummer (Vereinsregister), falls vorhanden
4. USt-IdNr., falls vorhanden
5. Redaktionell verantwortliche Person nach § 18 Abs. 2 MStV
6. Hosting-Anbieter mit Sitz und Aufbewahrungsdauer der Server-Logs

Solange etwas fehlt, zeigen Impressum und Datenschutz einen roten Hinweis „Fehlt noch“.

## Probetraining (laut Briefing vor Veröffentlichung abstimmen)

- Bestätigen: „Erste Einheit kostenlos“, „Handschuhe und Bandagen leihen wir dir“, „Kein Vertrag im Voraus,
  keine Anmeldung online. Ein Anruf reicht“, „zehn Minuten vor Trainingsbeginn da sein“.
- Widerspruch: Die Startseite der Quelle sagt „Ein Anruf reicht“, die Kontaktseite „oder du stehst zehn Minuten
  vor Trainingsbeginn in der Halle“. Ist Vorbeikommen ohne Anruf in Ordnung? Die neue Seite empfiehlt
  „kurz Bescheid geben“ – bitte bestätigen.
- Gilt das kostenlose Probetraining für alle Formate? Die Quelle erwähnt „als Probetraining offen“ nur bei den
  Hansefit-Kursen. Die neue Seite markiert Freies Training als „nur für Mitglieder“ und Curvy/Therapeutisches
  Boxen als „nach kurzer Absprache“.

## Mitgliedschaft und Preise

- Auf der aktuellen Website stehen keine Beiträge, Laufzeiten oder Kündigungsfristen. Die neue Seite verweist dafür
  auf Telefon/E-Mail. Sollen Preise veröffentlicht werden? Wenn ja: Beiträge je Altersgruppe, Aufnahmegebühr,
  Laufzeit, Familien-/Schülerrabatte.
- Hansefit ist bei fünf Formaten genannt. Gibt es weitere Partner (z. B. Urban Sports Club, Wellpass)?

## Trainer:innen

- Nur **Arton (Head Coach, @coach_arton)** ist namentlich belegt. Für alle anderen Gruppen nennt die Quelle
  „Trainer:in wird ergänzt“. Benötigt: Namen, Fotos, Lizenzen/Qualifikationen, Erfahrung, kurze Beschreibung –
  jeweils mit Einverständnis der Person.
- Die Quelle sagt einmal „seit der ersten Einheit“ und einmal „Zehn Jahre später“, die Halle besteht aber seit
  2015 (11 Jahre). Die neue Seite verwendet nur „seit der ersten Einheit“.
- Ein echtes Porträt von Arton fehlt. Auf der Team-Seite steht sein Name derzeit groß über einem Hallenfoto.

## Kurse und Zeiten

- **„Kraft Maga“ oder „Krav Maga“?** Kursseite und Plan der Quelle schreiben „Kraft Maga“, der Text auf der
  Startseite „Krav Maga“. Übernommen wurde „Kraft Maga“.
- **Jugend Boxen Vollkontakt**: Einstiegsalter? Die Quelle sagt „im Studio erfragen“.
- **Curvy Boxen / Therapeutisches Boxen**: feste Termine oder weiter „nach Absprache“?
- **Halle 1 / Halle 2**: Bezeichnungen so übernehmen? Wo sind sie im Gebäude (für Erstbesucher)?
- Gibt es Sommer-/Ferienpausen oder Training am Wochenende?
- Kurzfristige Ausfälle: Die Quelle verweist auf Instagram – soll das so bleiben?

## Bewertungen und Social Proof

- „4,9 von 5 aus 61 Google-Bewertungen“ stammt aus der Quelle und wurde hier nicht live geprüft. Vor dem Livegang
  bei Google kontrollieren und in `src/content/site.ts` aktualisieren (die Prüfung erinnert monatlich daran).
- Einzelne Bewertungstexte sind bewusst **nicht** zitiert. Wenn gewünscht: Freigabe der Verfasser:innen
  oder ein offizielles Google-Widget (dann Datenschutz ergänzen).
- Follower-Zahlen sind bewusst nicht genannt, weil sie schnell veralten.
- Wettkampferfolge, Titel und Vereinsgeschichte über „seit 2015 am Tonberg“ hinaus: Gibt es belegbare Erfolge
  (Name, Jahr, Turnier)? Diese wären für Jugendliche sehr wirkungsvoll.

## Fotos und Videos (größter Hebel für die Wirkung)

Vorhanden sind 14 echte Hallenfotos, alle **ohne Menschen**. Für die Jugend-, Community- und Trainerbereiche fehlen:

- Trainingsfotos mit Jugendlichen (Sandsack, Pratzen, Ring, Gruppe) – mit schriftlichem Einverständnis der Eltern
- Porträts der Trainer:innen
- Gruppen- und Wettkampffotos
- Kurze Videoclips aus der Halle (10–20 s, ohne Ton, für den Hero als Loop)
- Außenansicht/Eingang (Backsteinfassade, Vordach, Aufsteller) für die Anfahrt
- Offizielles Logo als SVG (die Seite nutzt bisher einen Text-Schriftzug)

Neue Fotos nach `assets/photos/` legen, `npm run images` ausführen und in den Daten (`src/content/*.ts`) zuordnen.
