# BoxZentrum Kiel – Website

Neue Website des BoxZentrum Kiel (Tonberg 15, alter Güterbahnhof). Eigenständige App, unabhängig vom
GlobeSIM-Shop im Hauptverzeichnis dieses Repositorys.

- Konzept, Audit und Review: [docs/KONZEPT.md](docs/KONZEPT.md)
- **Vor dem Livegang klären:** [docs/OFFENE-FRAGEN.md](docs/OFFENE-FRAGEN.md)

## Entwickeln

```sh
cd boxzentrum
bun install        # oder npm install
bun run dev        # http://localhost:5180
```

## Bauen und veröffentlichen

```sh
bun run build      # statisches HTML für alle Seiten in dist/client
bun run preview    # prüft den fertigen Build auf http://localhost:4180
bun run check:launch   # schlägt fehl, solange Pflichtangaben fehlen
```

`dist/client` kann auf jeden Webspace oder jedes CDN hochgeladen werden: Netlify, Cloudflare Pages, Vercel
oder klassisches Hosting. Unbekannte Adressen sollen `404.html` ausliefern. Die öffentliche Adresse für
Canonicals und Sitemap setzt du beim Build mit `SITE_URL=https://… bun run build` (Standard:
https://boxzentrum-kiel.de).

## Inhalte pflegen

Alle Inhalte liegen in `src/content/`:

| Datei | Inhalt |
| --- | --- |
| `site.ts` | Kontakt, Adresse, Social, Bewertungsstand, Probetraining, Grundsätze, Anfahrt |
| `courses.ts` | Alle Formate mit Texten, Zielgruppen, Zeiten, Hallen, Foto |
| `team.ts` | Trainer:innen (nur freigegebene Personen eintragen) |
| `legal.ts` | Pflichtangaben für Impressum und Datenschutz |
| `photos.ts` | Bildbeschreibungen (Alt-Texte) |

Der Trainingsplan, die Live-Hallenuhr, die Wochenleiste und die strukturierten Daten werden automatisch aus
`courses.ts` erzeugt. `bun run test` prüft den Plan auf Konsistenz (z. B. keine Doppelbelegung einer Halle).

## Neue Fotos

1. JPG (mind. 2000 px breit) nach `assets/photos/<name>.jpg` legen.
2. `bun run images` ausführen. Das erzeugt AVIF/WebP in mehreren Größen, Blur-Platzhalter und `src/content/photos.gen.ts`.
3. Alt-Text in `src/content/photos.ts` ergänzen und das Foto in `courses.ts` oder auf einer Seite zuordnen.
