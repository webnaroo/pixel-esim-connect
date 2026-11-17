# BoxZentrum Kiel – Hinweise für Agents

- Eigenständige App (TanStack Start + Tailwind v4, statisch vorgerendert). Nichts aus dem GlobeSIM-Shop (`../src`) importieren.
- Inhalte nur aus belegten Quellen: aktuell https://boxzentrum.kif-server.de/ (Stand 17.11.2026). Nichts erfinden
  (Trainer, Preise, Bewertungen, Erfolge, Mitgliederzahlen). Offene Punkte gehören in `docs/OFFENE-FRAGEN.md`.
- Alle Inhalte zentral in `src/content/`; Plan, Hallenuhr, Wochenleiste und JSON-LD leiten sich aus `courses.ts` ab.
  Nach Änderungen `bun run test` ausführen.
- Pflichtangaben stehen in `src/content/legal.ts`. Fehlende Felder bleiben sichtbar markiert,
  `bun run check:launch` blockiert den Livegang.
- Rot (`--color-red`) nur für die Hauptaktion und den Live-Status. Hover-Effekte nur in `@media (hover: hover)`.
  Animationen nur mit `transform`/`opacity`, und `prefers-reduced-motion` muss greifen.
- Keine Drittanbieter-Einbettungen ohne Klick-Einwilligung (siehe `osm-map.tsx`); keine Cookies, kein Tracking.
- Fotos nur über `npm run images` einbinden (AVIF/WebP + Blur-Platzhalter), nie Originale direkt referenzieren.
