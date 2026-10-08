# GlobeSIM – Umsetzungsplan

Die Spezifikation ist groß. Ich baue alles in der Reihenfolge aus Abschnitt 31, in Etappen. Bei echten Blockern frage ich nach, sonst nicht. Fehlende eSIMerge-Details halten mich nicht auf: Der Shop bleibt im Setup-Modus, bis die Zugangsdaten da sind.

## Etappe A (dieser Durchgang): Grundlage, im Setup-Modus voll nutzbar
1. Designsystem: Paper/Petrol/Mint, Bricolage Grotesque + Instrument Sans (lokal eingebunden), 12/14px-Radien, keine Schatten, Phosphor-Icons, flag-icons. Wortlogo "GlobeSIM", Favicon "G".
2. Layout: Header (sticky, mobil Vollbild-Menü), Footer, Grundlayout für alle Seiten.
3. Lovable Cloud aktivieren: komplettes Datenmodell aus Abschnitt 17 mit RLS, Rollen in eigener Tabelle, `has_role()`, Startdaten (alle Länder auf Deutsch mit Aliassen, Regionen, Einstellungen mit `shop_enabled=false`). Keine Tarife, keine Preise.
4. Anmeldung: E-Mail + Passwort, Magic Link, Google.
5. Provider-Schicht für eSIMerge: types, config (alle Werte leer + `TODO(ESIMERGE)`), mapping, schemas, client (Timeout, Retry nur für GET, Circuit Breaker, Logging), adapter. Fehlende Werte werfen `ProviderNotConfiguredError`.
6. Shop-Zustand (`not_configured` / `catalog_empty` / `ready_disabled` / `live`) zentral ermittelt.
7. Startseite (6 Sektionen), Suche (Fuse.js, Umlaute, Aliasse, Tastatur, Vollbild mobil), /destinations, Länder- und Regionsseiten mit PlanCards, Tabs "Datentarife | Unlimited" und ehrlichem "Tarife werden vorbereitet"-Zustand.

## Etappe B
- Preisberechnung (Wechselkurse, Margen, Rundung, MwSt.) mit Tests.
- Katalog-Sync (zeitgesteuert + Knopf), Sync-Historie.
- Admin → Integrationen: Ampel-Checkliste (ohne Secret-Werte), Verbindung testen, API-Explorer mit maskierten Antworten, Schalter "Shop aktiv" und "Katalog-Sync aktiv".

## Etappe C
- Checkout (3 Schritte, Gast erlaubt, Widerrufs-Hinweis), Stripe-Zahlung, Stripe- und Provider-Webhooks mit Signaturprüfung und Duplikatschutz, Auslieferung mit Idempotenz, Wiederholversuche, Erstattung.
- Bestätigungsseite mit Live-Status, Installationsseite (QR aus LPA, Direktinstallation, manuelle Daten mit Kopieren), E-Mails.

## Etappe D
- Konto: Meine eSIMs, Detail, Bestellungen, Einstellungen, Datenlöschung.
- Statische Seiten, FAQ, Blog, Rechtsseiten (Inhalte als Platzhalter, klar markiert – echte Impressumsdaten musst du liefern).
- Restlicher Admin (Bestellungen, Kunden, eSIMs, Tarife, Preise, Inhalte, Logs, Audit).
- SEO (Titel/Beschreibungen, strukturierte Daten, sitemap.xml, robots), Performance, Barrierefreiheit, `docs/INTEGRATION.md`.

## Was ich von dir später brauche
- eSIMerge: Base URL, API-Key, Webhook-Secret, Beispielantworten.
- Stripe-Zugang (wird beim Checkout-Schritt angefragt).
- Echte Firmendaten für Impressum/AGB.

## Technische Details
- Die App läuft auf TanStack Start statt einer reinen Vite-SPA. Statt Supabase Edge Functions nutze ich Server-Funktionen (`createServerFn`) und Server-Routen unter `src/routes/api/public/*` für Webhooks und Cron. Länder-/Regionsseiten werden damit serverseitig gerendert (gut für SEO).
- Provider-Schicht liegt unter `src/lib/providers/esimerge/` als `*.server.ts` (config, mapping, schemas, client, adapter) plus `types.ts`/`index.ts`; nur `config.ts` und `mapping.ts` müssen später befüllt werden.
- Secrets exakt: `ESIMERGE_BASE_URL`, `ESIMERGE_API_KEY`, `ESIMERGE_WEBHOOK_SECRET`, Stripe-Keys. Keine Dummy-Werte; fehlende erscheinen im Admin als "nicht gesetzt".
- Aktivierungsdaten verschlüsselt gespeichert, nur über geprüfte Server-Funktionen lesbar; Gäste über signiertes, ablaufendes Token.
- Testdaten nur hinter `VITE_USE_FIXTURES=true` (Standard aus), sichtbar als "Testdaten" markiert.
- Unit-Tests: Preisberechnung, Such-Normalisierung, Mapping, Webhook-Signatur.
