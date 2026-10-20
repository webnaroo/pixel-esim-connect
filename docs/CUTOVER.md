# Umzug von globesim.de: Lovable → Cloudflare + Supabase

Ziel: `globesim.de` zeigt auf den Cloudflare-Worker, der Shop läuft mit eigener Supabase-Datenbank, Stripe live und eSIMerge live.
Der alte Lovable-Shop bleibt bis zum Schluss unberührt und dient als Rückfallstufe.

**Grundregel:** Schritte nie überspringen und nie zwei große Dinge gleichzeitig ändern. Nach jedem Block kurz testen.

## Phase 0: Vorbereitung (jederzeit, ohne Risiko)
- [ ] **DNS-Einträge sichern.** Bei One.com die komplette DNS-Liste der Domain `globesim.de` als Screenshot/Text speichern (A, AAAA, CNAME, MX, TXT, DKIM, DMARC, SPF, die Resend-Einträge, die Einträge für `notify`). Ohne diese Liste ist ein Rückfall schwer.
- [ ] **Alte Nameserver notieren** (One.com → Domain → Nameserver). Sie werden für den Rückfall gebraucht.
- [ ] **TTL senken:** Bei One.com die TTL der Einträge für `@` und `www` auf 300 Sekunden stellen, mindestens 24 Stunden vor dem Umzug.
- [ ] **E-Mail klären:** Wo liegt das Postfach `info@globesim.de` / `support@globesim.de` (One.com-Mail)? Die MX-Einträge dafür müssen beim Wechsel unverändert bleiben.
- [ ] Cloudflare-Account bereit, Domain noch **nicht** hinzugefügt.

## Phase 1: Live-Zugänge auf dem Worker vorbereiten (der Shop bleibt geschlossen)
Worker → Settings → **Variables and secrets** (Runtime, Typ Secret). Die Test-Werte bleiben, bis die Live-Tests laufen.
- [ ] `STRIPE_LIVE_API_KEY` (eigener `rk_live_...`)
- [ ] `ESIMERGE_API_KEY` wird erst in Phase 4 auf den Live-Token gestellt (bis dahin Sandbox).
- [ ] Alte Test-Bestellungen merken (siehe Phase 2).

## Phase 2: Daten prüfen
Der Dump stammt vom 20.10.2026 (ca. 18:40 UTC). Seitdem darf es im **alten** Projekt keine neuen Daten gegeben haben.
- [ ] Im alten Projekt (Lovable Cloud, SQL/Tabellenansicht) prüfen, ob es **neuere** Bestellungen, Nutzer oder Rechnungen gibt:
  - Zeitpunkt der letzten Bestellung (`orders.created_at`), Anzahl `auth.users`, Anzahl `orders`.
- [ ] Im neuen Projekt dieselben Zahlen abfragen und vergleichen.
- [ ] Sind im alten Projekt neue Daten dazugekommen: **nicht umziehen**, erst Datenabgleich planen (zweiter Export, nur die neuen Zeilen übernehmen). Der Lovable-Export ist nur einmal alle 24 Stunden möglich.
- [ ] **Testdaten im neuen Projekt entfernen** (meine/deine Testbestellungen mit Stripe-Testmodus und eSIMerge-Sandbox). Erst auflisten, dann gezielt löschen, nicht pauschal:
  ```sql
  select id, status, is_sandbox, stripe_env, created_at from public.orders order by created_at desc limit 20;
  ```
  Beim Löschen auf abhängige Tabellen achten (`esims`, `audit_log`). Lieber vorher fragen.
- [ ] Der Sandbox-Test-Tarif (`esm_plan_tr_5gb_15d`) bleibt `is_active = false`.

## Phase 3: Umzugstag
Ruhige Zeit wählen (z. B. früh morgens), 1 bis 2 Stunden einplanen.

1. [ ] **Alten Shop schließen:** Im alten Lovable-Projekt Admin → Go-Live → *Shop deaktivieren*. Offene Bestellungen vorher abwarten (Status prüfen).
2. [ ] **Domain zu Cloudflare:** Cloudflare → *Add a domain* → `globesim.de` → Free-Plan. Cloudflare liest die vorhandenen DNS-Einträge ein.
3. [ ] **Einträge vergleichen** mit der Liste aus Phase 0. Besonders prüfen:
   - alle **MX**-Einträge und **TXT** (SPF, DKIM, DMARC) unverändert,
   - die **Resend**-Einträge (`resend._domainkey`, `send`-MX/TXT),
   - Mail-Einträge auf **DNS only** (graue Wolke), nicht proxied.
4. [ ] Die alten **A/AAAA/CNAME-Einträge für `@` und `www`**, die auf Lovable zeigen, entfernen. Cloudflare legt sie beim Zuordnen des Workers selbst an.
5. [ ] **Worker zuordnen:** Worker → Settings → *Domains & Routes* → *Add → Custom domain* → `globesim.de` und `www.globesim.de`.
6. [ ] **Nameserver wechseln:** Bei One.com die zwei Cloudflare-Nameserver eintragen. Warten, bis Cloudflare die Domain als *Active* zeigt (Minuten bis Stunden).
7. [ ] Seite `https://globesim.de` öffnen: Es muss die **neue** Seite kommen (Logo und Bilder, Anmeldung). Ein Test mit `www` ebenso.
8. [ ] **Mail prüfen:** Eine Mail an `info@globesim.de` senden und eine Test-E-Mail im Admin auslösen.

## Phase 4: Auf die echte Domain umstellen
- [ ] **Supabase → Authentication → URL Configuration:** Site URL `https://globesim.de`, Redirect URLs `https://globesim.de/**` und `https://www.globesim.de/**`. Die Worker-Adresse kann dort bleiben.
- [ ] **Supabase → Authentication → Hooks → Send Email:** URL auf `https://globesim.de/api/public/auth/email-hook` ändern (Secret bleibt).
- [ ] **Cron-Adresse:** SQL Editor:
  ```sql
  update public.internal_secrets set value = 'https://globesim.de' where name = 'cron_url';
  ```
- [ ] **Stripe (Live-Modus):** Neuen Webhook `https://globesim.de/api/public/payments/webhook?env=live` mit den sechs Ereignissen aus `docs/SELF-HOSTING.md` anlegen → Secret in `PAYMENTS_LIVE_WEBHOOK_SECRET`.
- [ ] **Build-Variable** `VITE_PAYMENTS_CLIENT_TOKEN` auf `pk_live_...` setzen, **Retry build** am Claude-Branch bzw. `main` (Production branch beachten).
- [ ] **eSIMerge:** `ESIMERGE_API_KEY` auf den **Live token** stellen. Neuen **Live**-Webhook auf `https://globesim.de/api/public/webhooks/esimerge` anlegen (der alte Endpunkt hat dieselbe URL, aber ein Secret, das in Lovable lag) → neues Secret in `ESIMERGE_WEBHOOK_SECRET_LIVE`, danach den alten Endpunkt löschen.
- [ ] **Google Cloud:** In deinem OAuth-Client die Lovable-Redirect-URIs erst **nach** erfolgreichem Umzug entfernen.
- [ ] **Katalog:** Go-Live-Assistent → *Live-Sync starten*. Danach muss der Live-Katalog gelten (Katalog > 0, Sandbox-Daten ausgeblendet).

## Phase 5: Live-Test, dann öffnen
- [ ] Go-Live-Checkliste komplett grün (außer „Shop aktiv").
- [ ] Admin-Probekauf mit **echter Zahlung** zum kleinsten Tarif (Admin bestätigt die Zahlung ausdrücklich). Prüfen: Zahlung, Webhook (Stripe zeigt 200), eSIM geliefert, Installationsseite, Mail.
- [ ] **Erstattung testen** (Stripe-Dashboard oder Admin), danach Statusmail prüfen.
- [ ] Erst jetzt: Admin → Go-Live → **Shop einschalten**.
- [ ] Die erste Stunde den Worker beobachten (Observability → Logs) und Stripe/eSIMerge-Webhook-Zustellungen prüfen.

## Rückfall (wenn etwas Gravierendes schiefgeht)
1. Neuen Shop sofort deaktivieren (Admin → Go-Live).
2. Bei One.com die **alten Nameserver** wieder eintragen (aus Phase 0) bzw. die gesicherten DNS-Einträge wiederherstellen.
3. Alten Lovable-Shop wieder aktivieren.
Die Datenbanken sind getrennt: Bestellungen, die zwischenzeitlich im neuen Projekt entstanden sind, müssen manuell geprüft werden.

## Nach dem Umzug (nach ein bis zwei Wochen ohne Probleme)
- [ ] Lovable-Stripe-Schlüssel („Verwaltet") und Lovable-Redirect-URIs entfernen.
- [ ] Lovable Cloud erst entfernen, wenn alles stabil läuft. Export-Dateien als Backup behalten.
- [ ] Supabase-Backups prüfen/aktivieren (Project Settings → Database → Backups).
- [ ] Datenbank-Passwort aus dem Chat durch ein neues ersetzen, `rk_live`-Schlüssel gegebenenfalls erneuern.
- [ ] Alte Delegation `notify.globesim.de` bei One.com entfernen, falls nichts mehr darüber läuft.
