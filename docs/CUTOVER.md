# Umzug von globesim.de: Lovable → Cloudflare + Supabase

Ziel: `globesim.de` zeigt auf den Cloudflare-Worker, der Shop läuft mit eigener Supabase-Datenbank, Stripe live und eSIMerge live.
Der alte Lovable-Shop bleibt bis zum Schluss unberührt und dient als Rückfallstufe.

**Grundregel:** Schritte nie überspringen und nie zwei große Dinge gleichzeitig ändern. Nach jedem Block kurz testen.

## Phase 0: Vorbereitung (jederzeit, ohne Risiko)
Stand 21.10.2026: Die Zone `globesim.de` liegt schon bei Cloudflare (Free, Active). DNS-Einträge (Auszug, Stand heute):
- `A globesim.de` und `A www` → `185.158.133.1`, Proxied. **Das ist der Lovable-Server, den der Umzug ersetzt.**
- `MX` ×4 → `mx1..mx4.mailpod16-cph3.g1i.one.com` (Prio 10), `TXT` SPF `include:_custspf.one.com`, `CNAME ed1/rsa1._domainkey` (One.com-Mail). **Nicht anfassen.**
- `CNAME rsend`, `CNAME send`, `TXT resend._domainkey` (Resend). **Nicht anfassen.**
- `TXT _dmarc` = `v=DMARC1; p=reject`. Unverändert lassen.
- `NS notify` → `ns3/ns4.lovable.cloud`, `TXT _lovable`, `_lovable.www`, `_lovable-email`: Lovable-Reste, erst nach dem Umzug löschen.

- [ ] Screenshot der aktuellen DNS-Liste (Cloudflare → DNS → Records) als Rückfall-Dokument aufheben.
- [ ] Prüfen, dass `https://globesim.de` aktuell den Lovable-Shop zeigt.

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
Ruhige Zeit wählen, 1 bis 2 Stunden einplanen. Weil die Domain schon bei Cloudflare liegt, wirken alle Änderungen **sofort** (kein Nameserver-Wechsel, keine Wartezeit), und der Rückfall dauert Sekunden.

1. [ ] **Alten Shop schließen:** Im alten Lovable-Projekt Admin → Go-Live → *Shop deaktivieren*. Offene Bestellungen vorher abwarten (Status prüfen).
2. [ ] **Rückfall vorbereiten:** Die zwei A-Einträge notieren (`@` und `www` → `185.158.133.1`, Proxied).
3. [ ] **Die zwei A-Einträge löschen:** Cloudflare → DNS → Records → `A globesim.de` und `A www.globesim.de` löschen. Alle anderen Einträge (MX, TXT, CNAME) bleiben.
4. [ ] **Worker zuordnen:** Worker → Settings → *Domains & Routes* → *Add → Custom domain* → `globesim.de`, danach `www.globesim.de`. Cloudflare legt die nötigen DNS-Einträge selbst an.
5. [ ] `https://globesim.de` öffnen (am besten im privaten Fenster): Es muss die **neue** Seite kommen. `www` ebenso.
6. [ ] **Mail prüfen:** Eine Mail an `info@globesim.de` senden und eine Test-E-Mail im Admin auslösen.

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
2. Cloudflare → Worker → Domains & Routes: die Custom Domains `globesim.de` und `www.globesim.de` entfernen.
3. Cloudflare → DNS → Records: `A globesim.de` und `A www` → `185.158.133.1`, **Proxied**, neu anlegen (Screenshot aus Phase 0).
4. Alten Lovable-Shop wieder aktivieren.
Die Datenbanken sind getrennt: Bestellungen, die zwischenzeitlich im neuen Projekt entstanden sind, müssen manuell geprüft werden.

## Nach dem Umzug (nach ein bis zwei Wochen ohne Probleme)
- [ ] Lovable-Stripe-Schlüssel („Verwaltet") und Lovable-Redirect-URIs entfernen.
- [ ] Lovable Cloud erst entfernen, wenn alles stabil läuft. Export-Dateien als Backup behalten.
- [ ] Supabase-Backups prüfen/aktivieren (Project Settings → Database → Backups).
- [ ] Datenbank-Passwort aus dem Chat durch ein neues ersetzen, `rk_live`-Schlüssel gegebenenfalls erneuern.
- [ ] Lovable-Reste in der DNS-Zone löschen: `NS notify` (ns3/ns4.lovable.cloud), `TXT _lovable`, `_lovable.www`, `_lovable-email`.
