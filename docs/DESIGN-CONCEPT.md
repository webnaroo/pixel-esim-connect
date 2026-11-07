# GlobeSIM – Designkonzept „Calm Precision"

Stand: Analyse des Ist-Zustands, **keine Code-Änderung**. Dieses Dokument ändert weder Funktionen, APIs, Datenbank noch Backend. Es beschreibt, was da ist, was inkonsistent ist und wie die Designsprache aussehen soll.

## 1. Architektur-Befund (was beim Redesign zu beachten ist)

| Bereich | Ist-Zustand | Konsequenz |
| --- | --- | --- |
| Stack | TanStack Start, React 19, Tailwind v4 (`@theme inline` in `src/styles.css`), Radix, `tw-animate-css`, Phosphor-Icons | Tokens leben in einer Datei; Umstellung ist zentral möglich |
| Tokens | `src/styles.css`: Marken-Tokens (`paper, surface, ink, ink-muted, primary, mint, line, line-strong`) plus shadcn-Aliasse (`background, card, border …`) | Zwei Namensräume für dieselben Werte; neue Tokens additiv ergänzen |
| Primitives | `ui-kit.tsx` (Button 52/48px, Input 56px, SegmentedControl) in **31 Dateien**; shadcn `ui/button.tsx` (36px, Schatten) nur noch in 5 `ui/*`-Dateien (sidebar, pagination, carousel, alert-dialog, calendar) | Zwei Button-Systeme. Dialog-Buttons sehen anders aus als Shop-Buttons |
| Homepage | `.home-*`-Klassen in `styles.css` überschreiben mobil per Struktur-Selektoren (`.home-hero [data-hero-search] > div > div:first-of-type > input`) | Fragil. Vor einem Redesign der Startseite erst in Komponenten-Props überführen |
| Overlays | shadcn/Radix + `tw-animate-css` (`zoom-in-95`, `fade`, `slide-in`) | Eine zentrale Stelle für Motion-Tokens reicht |
| Admin | nutzt dieselben Komponenten | Jede Primitive-Änderung wirkt auch im Admin; dort visuell mitprüfen |
| Unberührbar | Subordner-Regeln: `src/lib/email-templates/AGENTS.md`, `mobile/AGENTS.md` (App zeigt die Live-Seite unverändert) | E-Mail-Templates sind eigenes Designsystem; die App erbt das Webdesign automatisch |

Bestehende Leitplanken aus `AGENTS.md`/`styles.css`, die das Konzept **respektiert**: keine Verläufe, keine großen Schatten, max. Radius 16px, Mint nur für „aktiv/bereit". Stripe/Linear-Niveau wird daher über Zurückhaltung, Typografie, Rhythmus und Motion erreicht, nicht über Effekte.

## 2. Befunde nach Bereich

### Farben und Kontrast (berechnet, WCAG)

| Paar | Kontrast | Bewertung |
| --- | --- | --- |
| ink / paper | 16.2 | sehr gut |
| ink-muted / paper | 5.6 | AA ok |
| weiß / primary | 11.8 | sehr gut |
| weiß / `mobile-action` (Blau) | 4.6 | AA ok, aber **fremder Blauton** außerhalb der Petrol-Palette |
| weiß / mint | 1.8 | nie Text auf Mint (aktuell nur Punkt, richtig) |
| warning / surface | 4.05 | als Text unter AA |
| line-strong / surface (Input-Rand) | **1.8** | WCAG 1.4.11 verlangt 3:1 für Feldgrenzen |
| line / surface (Kartenrand) | 1.35 | als Dekor ok, trägt aber die ganze Kartenhierarchie |

Außerdem: `@custom-variant dark` ist deklariert, aber es gibt keine `.dark`-Tokens. Das ist toter Code.

### Typografie
- Bricolage Grotesque (Display) + Instrument Sans (Text): charaktervoll, bleibt.
- Skala nur über `h1–h3` (34/56, 26/36, 20/24) plus verstreute Werte: `text-[15px]`, `[10px]`, `[11px]`, `[17px]`, `[22px]`, `[28px]`.
- 10px-Text auf der mobilen Startseite (Vorteile, Zieltiles) liegt unter der Lesbarkeitsgrenze.
- Hero überschreibt Tracking per `!tracking-normal` bzw. `letter-spacing: 0`, der Rest nutzt `-0.02em`. Display-Typografie ist nicht einheitlich.

### Abstände, Layout, Radien, Schatten
- `container-page` (1200px, 20/32px Padding) ist konsistent. Gut.
- Radien: `rounded-md` 86×, `rounded-lg` 85×, `rounded-[14px]` 32× (identisch mit `rounded-lg`), dazu 8/9/16/40px. Die Stufen 12 und 14 sind optisch nicht unterscheidbar.
- Schatten: Marke sagt „keine großen Schatten", im Code `shadow-md/lg` je 7×, `shadow` 8× (u. a. `Card`). Overlays brauchen Tiefe, Karten nicht.

### Buttons und Karten
- Kein `:active`-Zustand (0 Treffer für `active:scale`). Klicks haben kein taktiles Feedback.
- Korrektur (Phase 1): Der Quelltext enthält kein `@media (hover: hover)`, aber Tailwind v4 erzeugt es für jede `hover:`-Utility selbst (im kompilierten CSS geprüft). Sticky-Hover auf Touch ist deshalb kein Problem; nur handgeschriebenes CSS müsste es selbst absichern.
- Primär-Button hat nur `transition-colors 150ms`. Funktioniert, hat aber keinen Charakter.
- Plan-Karte: gute Detaillösung (`border-2` mit `p-[15px]`-Ausgleich verhindert Layout-Sprung). Bleibt als Muster.
- `Card` (shadcn) ist `rounded-xl … shadow`, die Shop-Karten sind `rounded-lg border` ohne Schatten. Zwei Kartenarten.

### Navigation
- Header: `bg-paper`, `border-b`, 56/64px. Aktiver Link nur durch `font-medium` (Layout-Sprung durch Gewichtswechsel, kein Indikator).
- Header-Suche erscheint auf `/` erst nach 320px Scroll abrupt, ohne Übergang.
- Mobiles Menü: wird bedingt gerendert, hat nur `fade-in 150ms`, **keine Exit-Animation**. Touch-Ziele 48px: gut.
- Footer: sauber, 5 Spalten, ok.

### Mobile Darstellung
- Touch-Ziele und Safe-Skip-Link sind vorbildlich. Mobile-Hero setzt eine knallblaue Suchleiste (`mobile-action`), die auf Desktop nicht existiert. Markenbruch zwischen Breakpoints.
- Struktur-Selektoren und `!important`-ähnliche Overrides machen die mobile Startseite zu einer eigenen Seite im selben Markup.

### Animationen und Interaktionen
- Es gibt **keine eigenen Easing-Kurven**. Nur `ease` (Standard) und `tw-animate-css`-Defaults.
- Dauern: Buttons/Karten 150ms, Dialoge 200ms, Sheet **500ms** (`data-[state=open]:duration-500`), über der 300ms-Grenze für UI.
- `transition-all` an 5 Stellen (accordion, tabs, progress, input-otp, sidebar).
- `prefers-reduced-motion` ist global behandelt. Gut.
- Skeletons nutzen `animate-pulse`. In Ordnung, aber ohne Shimmer-Kohärenz.
- Positiv: Suche mit Debounce, Tastatur-Shortcut `/`. Tastatur-Aktionen sind nicht animiert, das bleibt so.

## 3. Designkonzept „Calm Precision"

**Idee:** Papierwarmes, ruhiges Petrol als Unterscheidungsmerkmal gegenüber den kalten Weiß/Violett-SaaS-Seiten. Präzision entsteht durch ein striktes System: wenige Stufen, überall dieselben. Premium-Gefühl kommt aus Typografie, Rhythmus und sauberer Bewegung.

### 3.1 Farbe
- **Behalten:** paper, surface, ink, ink-muted, primary (Petrol), mint (nur Status), Semantikfarben.
- **Neu (additiv):** `--line-control` für Feldränder mit ≥3:1 gegen paper/surface (Wert per Skript gegen Kontrast prüfen, nicht schätzen). `--line` bleibt für Karten/Trenner.
- **Entscheiden (Inhaber):** `mobile-action`-Blau abschaffen und mobil Petrol nutzen, oder bewusst als Aktionsfarbe überall einführen. Empfehlung: abschaffen, ein Akzent genügt.
- `--warning` als Textfarbe abdunkeln oder nur für Rand/Icon verwenden.
- Dark Mode: Ablehnen für Phase 1. Toten `dark`-Variant erst entfernen, wenn bestätigt.

### 3.2 Typografie (eine Skala, sechs Stufen)
| Stufe | Mobil / Desktop | Gewicht | Tracking |
| --- | --- | --- | --- |
| Display (Hero-H1) | 36 / 56 | 600 | -0.03em |
| H2 | 26 / 36 | 600 | -0.02em |
| H3 | 20 / 24 | 600 | -0.02em |
| Body | 16 / 16 (18 Lead) | 400 | 0 |
| Small | 14 | 400/500 | 0 |
| Caption | 12 (Minimum) | 500 | 0.01em |

Regeln: nichts unter 12px, keine freien `text-[…px]`, Zahlen immer `tabular`. Preise bekommen eine eigene Rolle (Display-Font, tabular).

### 3.3 Raum und Form
- Abstand 4px-Raster, Sektionsabstand 48 / 64 / 96px (mobil / Tablet / Desktop).
- Radien: **8** (Chips, kleine Controls), **12** (Buttons, Inputs, Karten), **16** (große Panels, Sheets), **full** (Pills, Avatare). `rounded-[14px]` und `--radius-lg: 14px` fallen weg.
- Elevation, drei Stufen: **0** nur Rand (Karten, Standard) · **1** Hover/Selected: 1px Rand dunkler plus feiner Schatten in Petrol-Tönung `0 1px 2px` · **2** Overlays (Popover, Dialog, Sheet): ein einziger, weicher Schatten. Kein `shadow-lg` sonst.

### 3.4 Komponenten
- **Ein** Button-System: `ui-kit` bleibt Quelle der Wahrheit; shadcn `ui/button` zieht dessen Varianten nach (Primary, Secondary, Ghost, Destructive, Link). Höhen: 48 (Standard), 40 (kompakt), 56 (Hero/Checkout). Press: `scale(0.97)`.
- **Karte:** eine Basis (`surface`, Rand `line`, Radius 12). Interaktive Karte: Hover hebt Rand an (nur `@media (hover: hover)`), Press `scale(0.99)`.
- **Input:** Rand `line-control`, Fokus: Petrol-Rand plus 3px Ring in 15 % Petrol.
- **Chip/Badge:** Status mit Punkt (Mint) bleibt, Text nie auf Mint.
- **Plan-Karte:** Muster beibehalten. Selected bekommt zusätzlich sanften Ring statt nur dickerem Rand.

### 3.5 Navigation
- Sticky Header mit dezentem Hintergrund-Blur (`backdrop-filter` ≤ 12px) erst nach Scroll, Rand blendet ein.
- Aktiver Link: 2px Petrol-Linie unten statt Gewichtswechsel (kein Layout-Sprung).
- Header-Suche auf `/` blendet mit Opacity/`translateY(-4px)` ein, reserviert aber den Platz (kein Shift).
- Mobiles Menü: dauerhaft gerendert, Ein- und Ausblenden per Transition (`opacity` + `translateY(-8px)`), Links gestaffelt (40ms).

### 3.6 Motion-System
Tokens zentral in `styles.css`:
```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);   /* Ein-/Ausblenden, Hover */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* Bewegung auf dem Screen */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* Sheets, mobiles Menü */
--dur-press: 120ms; --dur-hover: 160ms; --dur-pop: 180ms; --dur-sheet: 280ms;
```
Regeln:
1. Nur `transform` und `opacity` animieren; `transition-all` entfernen.
2. Nie `ease-in`; nie von `scale(0)`; Pop-ins starten bei `scale(0.96)` plus Opacity.
3. Popover und Dropdown skalieren aus dem Auslöser (`transform-origin` von Radix), Dialoge aus der Mitte.
4. UI-Animationen < 300ms. Sheet von 500 auf 280ms.
5. Tastaturgetriebene Aktionen (Suche mit `/`, Navigation per Pfeile) bleiben ohne Animation.
6. Listen: Stagger 40ms, max. 6 Elemente, nur beim ersten Erscheinen.
7. Hover über `hover:`-Utilities (Tailwind v4 gated sie bereits auf hover-fähige Geräte); eigenes CSS selbst mit `@media (hover: hover)` absichern.
8. Reduced Motion: Bewegung entfällt, Opacity bleibt.

### 3.7 Mobile
- Eine Marke über alle Breakpoints: keine abweichende Aktionsfarbe.
- Mindestschrift 12px; Zieltiles der Startseite bekommen größere Typo statt 10px.
- Sticky Kauf-/Checkout-Leiste mit Safe-Area-Inset, `100dvh` statt `100vh`, Inputs ≥16px gegen iOS-Zoom (bereits 16px, beibehalten).
- Hero: eine Markup-Variante mit responsiven Props statt doppelter `sm:hidden`-Spans und Struktur-Selektoren.

## 4. Umsetzungsreihenfolge (jeweils eigener, rückbaubarer Schritt)

| Phase | Inhalt | Risiko | Prüfung |
| --- | --- | --- | --- |
| 0 ✅ | Neue Tokens additiv in `styles.css` (Motion, `line-control`, Radius-Skala), nichts verwendet | keins | `bun run build` |
| 1 ✅ | Primitives vereinheitlichen: Button, Card, Input; `transition-all` raus; Press-Zustand; Hover-Gating | niedrig, wirkt auch im Admin | `bun run test`, Screenshots Shop und Admin |
| 2 ✅ | Motion: Overlays, Sheet-Dauer, Menü-Exit | niedrig | Slow-Motion-Prüfung, Reduced-Motion-Test |
| 3 ✅ | Header/Footer/Navigation | mittel (Legal-Links, SSR-Hydration laut `AGENTS.md`) | Hydration ohne Warnung, Tastatur-Test |
| 4 ✅ | Startseite entflechten (`.home-*` → Komponenten) | mittel | Visueller Vergleich 375/768/1280px |
| 5 | Kategorie-, Detail-, Checkout-, Konto-Seiten | je Seite | Checkout nur visuell, Logik unberührt |

Nicht anfassen: Zahlungs-, Fulfillment-, Webhook-, Preis- und Meta-Pixel-Logik, Datenabfragen, E-Mail-Templates, `mobile/`.

## 5. Offene Entscheidungen für den Inhaber
1. `mobile-action`-Blau abschaffen (empfohlen) oder zur durchgehenden Aktionsfarbe machen?
2. Dark Mode: ausdrücklich nicht geplant, dann toten `dark`-Variant entfernen?
3. Eingrenzung der Eingabefeld-Ränder auf ≥3:1 sichtbar dunkler (leicht strengerer Look) akzeptieren?
4. Hintergrund-Blur im Header erlaubt (kein Verlauf, nur Transparenz)?
