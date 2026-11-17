# BoxZentrum Kiel – Audit, Designkonzept, Review

## 1. Audit

**Projekt.** Das Repository `pixel-esim-connect` enthält ausschließlich den GlobeSIM-eSIM-Shop (Lovable,
TanStack Start, Supabase, Stripe). BoxZentrum-Dateien gab es darin nicht. Die Website ist deshalb als
eigenständige App im Ordner `boxzentrum/` entstanden. Der Stack ist derselbe (React 19, TanStack Start/Router,
Tailwind CSS v4, Vite), der Shop bleibt unberührt.

**Design-Skills.** Die im Briefing genannten Skills „apple-design“ und „emil-design-eng“ sind in dieser Umgebung
nicht installiert. Umgesetzt wurden ihre bekannten Grundsätze:

- Apple: Hierarchie, Abstände, Typografie, Klarheit
- Emil Kowalski: kurze Ease-out-Kurven, nur `transform`/`opacity` animieren, `:active`-Feedback, Hover nur auf
  Zeigergeräten, `prefers-reduced-motion`

Dazu kam der installierte Skill „frontend-design“.

**Quellen.**

| Quelle | Ergebnis |
| --- | --- |
| boxzentrum.kif-server.de | Vollständig gelesen: 15 Formate, 26 Einheiten, Kontakt, Halle, Grundsätze, Arton, Probetraining, 14 Fotos |
| boxzentrum-kiel.de | Nicht erreichbar (423 Locked), Webarchiv blockiert |
| Instagram | Nicht abrufbar (429) |

**Schwächen der Ausgangsseite.**

- Hell-dunkler Mix ohne klare Bildsprache
- Sichtbare Platzhalter („Bildfläche – Arton an den Pratzen“, „Trainer:in wird ergänzt“ 14-mal)
- Trainingsplan als klassische Tabelle
- Kein mobiler Sticky-CTA
- Kein eigener Bereich für Jugendliche und Eltern
- Impressum mit `[[ ]]`-Platzhaltern

**Assets.** 14 hochwertige, dunkle Hallenfotos (2048 px): Ring, Truss, Sandsäcke, Speedball, Kraftraum,
Leih-Ausrüstung. Es gibt keine Personen-, Trainer-, Wettkampf- oder Außenfotos, kein Video und kein Logo als Datei.

## 2. Designkonzept: „Licht im Ring“

Die Halle ist dunkel, Licht fällt nur auf den Ring. So arbeitet auch die Website: tiefes Schwarz, große
Plakatschrift, Off-White wie Ringseile. Rot nur dort, wo es um den nächsten Schritt geht (Probetraining,
„Jetzt in der Halle“).

### Farben

| Token | Hex | Rolle |
| --- | --- | --- |
| pitch | `#070606` | Grundfläche |
| coal | `#100e0d` | Wechselflächen |
| anthracite | `#1a1816` | Karten, Eingaben |
| iron | `#2c2926` | Linien |
| ash / fog | `#a39c94` / `#cfc9c1` | Sekundärtext |
| bone | `#f3efe9` | Text, helle Buttons |
| red | `#e5262d` | Hauptaktion, Live-Status |

Trainingsarten, nur als kleine Markierungen:

- Vollkontakt: Rot (rote Ecke)
- Fit Boxen: Off-White
- Kraft & Selbstverteidigung: Blau (blaue Ecke des Rings)
- Freies Training: Grau
- Gesundheit: Messing

### Typografie

Eine Familie, **Archivo Variable** mit Breitenachse (62–125 %), selbst gehostet:

- **Plakatzeilen**: 62 % Breite, Gewicht 860, Versalien, Zeilenabstand 0,84 – die Sprache von Kampfankündigungen
- **Fließtext**: 100 % Breite, 17 px / 1,6
- **Lead**: 20–24 px
- **Zeiten**: tabellarische Ziffern

Keine Versal-Labels über Überschriften und keine einzeln eingefärbten Wörter.

### Layout

12-Spalten-Raster, max. 1472 px, großzügige Abschnittsabstände (96–192 px), asymmetrische Bild-/Textflächen,
Fotos als Vollflächen mit Verlauf ins Schwarz, dezente Filmkörnung.

### Signaturen

1. **Hero** – Ring unter der Lichttraverse, „Dein Ring. Dein Weg. Dein Team.“ in Plakatschrift, ruhiges Aufziehen des Fotos.
2. **Live-Hallenuhr** – zeigt aus dem echten Plan, was gerade läuft oder als Nächstes kommt (Ortszeit Kiel).
3. **Wochen-Lichtleiste** – die 26 Einheiten als farbige Balken über zwei Hallen.
4. **Trainingsindex** – Liste mit großem, mitlaufendem Foto (Desktop) bzw. Bildkarten (Handy).

### Seiten

| Seite | Zweck |
| --- | --- |
| `/` | Hero, Statement, „Finde deine Stärke“ (Jugend + Eltern), Trainingsindex, Woche, Halle, Head Coach, Grundsätze, Stimmen, Probetraining |
| `/training` | Alle 15 Formate mit Filter nach Zielgruppe, Fit-Boxen-Stufen, Hansefit |
| `/training/:slug` | 15 Detailseiten: Eckdaten, Ablauf, Mitbringen, Zeiten, Trainer, Weg/Stufen, Probetraining, verwandte Formate |
| `/trainingsplan` | Wochenraster (Desktop) bzw. Tage zum Wischen (Handy), Filter, „Heute“, Live-Linie |
| `/jugend` | Für Jugendliche und Eltern: Altersstufen, Grundsätze, Elterninfos, gefilterter Plan |
| `/team` | Arton (belegt) und das Team hinter den Gruppen, ohne erfundene Personen |
| `/halle` | Standort und Geschichte, Galerie, „Mehr als nur Sport“, Anfahrt |
| `/probetraining` | Ablauf in 4 Schritten, E-Mail-Vorbereitung (ohne Server), FAQ |
| `/kontakt` | Telefon, E-Mail, Social, Karte nur nach Klick, Anfahrt |
| `/impressum`, `/datenschutz` | Rechtstexte mit klar markierten Lücken |

### Bewegung

- Ladeeinstieg des Heros: Foto zieht auf, Zeilen setzen sich gestaffelt. Die Schrift ist dabei sofort lesbar, gut für das LCP.
- Wenige Bild-Reveals (Vorhang von unten) und Parallaxe per CSS-Scroll-Timeline (läuft auf dem Compositor)
- Seitenwechsel per View Transitions
- Weiches Mausrad-Scrollen (Lenis, nur auf Zeigergeräten)
- Alles entfällt bei „Bewegung reduzieren“.

### Conversion

Rote Hauptaktion in Hero, Header, Kursseiten und Seitenende. Dazu:

- Mobile Sticky-Leiste (Probetraining + Anrufen)
- Klickbare Telefonnummer und E-Mail
- E-Mail-Vorbereitung mit Kurs und Wunschtermin
- Klare Antworten zu Kosten, Ablauf und Mitbringen

## 3. Technik

- Statisches HTML für jede Seite (Prerender), lauffähig auf jedem Webspace/CDN: `dist/client`
- Bilder als AVIF/WebP in 5 Breiten mit Blur-Platzhaltern, dazu ein OG-Bild
- SEO: Canonicals, Open Graph, `sitemap.xml`, `robots.txt`
- Strukturierte Daten: `SportsActivityLocation` mit Öffnungszeiten aus dem Plan, `BreadcrumbList`, `FAQPage`
- Datenschutz: keine Cookies, kein Tracking, Schriften lokal, OpenStreetMap erst nach Klick
- Daten zentral in `src/content/`, mit Tests gegen die Quelle (26 Einheiten, Hallenzeiten, keine Doppelbelegung, Live-Logik)

## 4. QA (17.11.2026)

- Screenshots Handy (390 px), Tablet (820 px) und Desktop (1440 px) aller Seiten
- Keine Konsolenfehler, keine fehlerhaften Requests, 404-Seite hydriert fehlerfrei
- Interaktionen geprüft: Menü (Fokus, Escape), Filter, Tages-Wischer, E-Mail-Vorbereitung, FAQ, Karte, reduzierte Bewegung
- Lighthouse (mobil, simuliert): Startseite Performance 95, Barrierefreiheit 100, Best Practices 100, SEO 100

## 5. Design-Review (selbstkritisch)

- **Premium?** Ja, wo die Halle trägt. Hero, Kursseiten und Halle wirken wie eine Sportmarke, nicht wie ein Verein.
- **16-Jährige:r begeistert?** Die Typografie und die Jugendsektion sprechen die Sprache. Was noch fehlt, sind
  **Menschen**: Ohne Fotos von Jugendlichen im Training bleibt der Ort leer. Das ist der wichtigste nächste
  Schritt (siehe OFFENE-FRAGEN.md).
- **Mobil gleichwertig?** Ja: eigene Bildkarten, Tages-Wischer statt Tabelle, Sticky-CTA, große Touch-Ziele.
- **Generische Bereiche?** Die Altersgruppen-Karten und die Stimmen-Kacheln sind am nächsten am Standard.
  Mit echten Fotos und zitierfähigen Bewertungen werden sie stärker.
- **Unnötige Animationen?** Bewusst reduziert: ein Ladeeinstieg, wenige Reveals, keine Effekte auf jeder Karte.
- **Glaubwürdig?** Alle Aussagen stammen aus der Quelle. Wo etwas fehlt, steht nichts Erfundenes, sondern ein ehrlicher Satz.
