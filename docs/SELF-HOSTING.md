# Betrieb ohne Lovable: Supabase + Cloudflare

Stand der Umstellung: Code läuft ohne Lovable-Dienste. Alles Geheime liegt in Cloudflare (Secrets) bzw. in Supabase.

## 1. Cloudflare (Workers, Build aus GitHub)
- Build-Befehl: `bun install --frozen-lockfile && bun run build`
- Deploy-Befehl: `npx wrangler deploy` (der Build schreibt `.wrangler/deploy/config.json` und `.output/server/wrangler.json`, `nodejs_compat` ist gesetzt)
- **Production branch** des Workers (Settings → Builds → Branch control) muss der Branch mit dem neuen Code sein, bis er in `main` gemerged ist. Im Build-Log steht der gebaute Branch.
- Der Worker heißt `webnaroo-pixel-esim-connect` (aus dem Repo-Namen abgeleitet). In Cloudflare denselben Namen für das Projekt wählen, sonst meldet der Build einen Namenskonflikt. Alternative zum Deploy-Befehl: `npx nitro deploy --prebuilt`.
- Domain `globesim.de` auf den Worker legen. Cron-Trigger in Cloudflare werden **nicht** gebraucht, die Jobs laufen in Supabase (`docs/self-hosting-cron.sql`).

### Variablen
Als **Build-Variablen** (werden beim Build eingebettet, nicht geheim):

| Name | Wert |
|---|---|
| `VITE_SUPABASE_URL` | `https://<projekt>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (Supabase → Connect) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Stripe Publishable Key. `pk_test_...` = Testbetrieb, `pk_live_...` = echte Zahlungen. **Die App wählt daran beim Build zwischen Sandbox und Live.** Erst mit `pk_test_` testen, dann auf `pk_live_` umstellen und neu bauen. |

Als **Secrets** (Laufzeit):

| Name | Quelle |
|---|---|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | wie oben |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys (secret key). Nur Server. |
| `STRIPE_LIVE_API_KEY`, `STRIPE_SANDBOX_API_KEY` | Stripe `sk_live_...` / `sk_test_...` |
| `PAYMENTS_LIVE_WEBHOOK_SECRET`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | `whsec_...` der jeweiligen Stripe-Webhooks (siehe 4.) |
| `ESIMERGE_BASE_URL`, `ESIMERGE_API_KEY` | eSIMerge-Portal |
| `ESIMERGE_WEBHOOK_SECRET`, `ESIMERGE_WEBHOOK_SECRET_LIVE` | eSIMerge-Portal |
| `GUEST_TOKEN_SECRET` | Alter Wert, wenn bekannt. Sonst neu setzen: alle bereits verschickten Gäste-Links werden ungültig. |
| `RESEND_API_KEY` | resend.com → API Keys |
| `SEND_EMAIL_HOOK_SECRET` | Supabase → Authentication → Hooks → Send Email (siehe 3.) |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key (optional, nur für Ratgeber-KI und SEO-Analyse) |
| `GEMINI_MODEL` | optional, Standard `gemini-3.8-flash` |
| `EMAIL_FROM_DOMAIN` | optional, Absender-Domain, falls in den Shop-Einstellungen keine hinterlegt ist |

**Achtung Stripe:** In `VITE_PAYMENTS_CLIENT_TOKEN` gehört ausschließlich der *Publishable key* (`pk_...`). `VITE_`-Variablen landen im Browser-Code, ein `sk_`/`rk_`-Schlüssel dort wäre öffentlich. Geheimschlüssel kommen nur als Worker-Secret (`STRIPE_*_API_KEY`).

`ADMIN_INITIAL_PASSWORD` und `LOVABLE_*` werden nicht mehr gebraucht. Die Cron-Routen prüfen ein Token aus `public.internal_secrets`, nicht aus der Umgebung.

## 2. Supabase
1. Dump einspielen (`auth.users`, `auth.identities`, dann Schema `public`), Rechte aus dem Dump prüfen (`esims` nur `service_role`, Spaltenrechte für `authenticated`).
2. Storage: Bucket `blog-covers` anlegen (nicht öffentlich) und Dateien hochladen.
3. Extensions `pg_cron` und `pg_net` aktivieren, dann `docs/self-hosting-cron.sql` ausführen.
4. Authentication → URL Configuration: Site URL `https://globesim.de`, Redirect URLs `https://globesim.de/**`.
5. Authentication → Providers → Google: eigene Client-ID und Secret. Bei Google als Redirect-URI `https://<projekt>.supabase.co/auth/v1/callback` eintragen.

## 3. Auth-E-Mails (Supabase Send Email Hook)
Supabase → Authentication → Hooks → **Send Email** → HTTPS:
- URL: `https://globesim.de/api/public/auth/email-hook`
- Secret erzeugen und als `SEND_EMAIL_HOOK_SECRET` in Cloudflare eintragen (Format `v1,whsec_...`, so einfügen).

Der Hook rendert die Vorlagen aus `src/lib/email-templates` und versendet über Resend. Absender ist `noreply@<Absender-Domain>`. Ohne aktiven Hook würde Supabase die Mails selbst (und ohne eigenes Design) verschicken.

## 4. Webhooks und Zahlungen
- Stripe: Webhook auf `https://globesim.de/api/public/payments/webhook?env=live` (und `?env=sandbox` mit Test-Key). Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.
- eSIMerge: Webhook-URL im Portal auf die neue Domain, Secret wie oben.

## 5. E-Mail-Domain
In Resend die Absender-Domain verifizieren (DNS-Einträge SPF/DKIM). Im Admin (Go-Live) dieselbe Domain als Absender-Domain eintragen. Solange sie nicht als verifiziert gilt, bekommen Bestellungen `email_status = pending_domain` und es geht keine Kundenmail raus.

## 6. Umzug (Cutover)
1. Shop bleibt geschlossen (`shop_enabled` aus), bis alles getestet ist.
2. Mit Stripe-Testschlüsseln eine komplette Bestellung durchspielen (Zahlung, Webhook, eSIM-Auslieferung, Mail, Installationsseite).
3. Anmeldung testen: E-Mail/Passwort, Google, Passwort zurücksetzen.
4. `VITE_PAYMENTS_CLIENT_TOKEN` auf `pk_live_...`, neu bauen, Live-Webhook prüfen.
5. Domain umstellen, Shop öffnen. Lovable erst danach abschalten und die Lovable-Redirect-URIs im Google-Client entfernen.

## 7. Betriebshinweise (im Betrieb gefunden)
- **Cloudflare Workers Paid ist nötig.** Die kostenlose Stufe erlaubt nur 10 ms CPU pro Anfrage; Go-Live-Seite, Katalog-Sync und Preisberechnung brechen dort mit „Worker exceeded CPU time limit" ab. Der Build setzt `limits.cpu_ms = 300000` (vite.config.ts → wrangler.json).
- **Secrets und Variablen:** Alles, was der laufende Worker liest, gehört in *Settings → Variables and Secrets* (Runtime, Typ Secret). Nur die `VITE_*`-Werte stehen im Build-Bereich. Eine geänderte Build-Variable wirkt erst nach *Retry build* (Secret-Deploys bauen nicht neu).
- **Supabase-Zeitlimit:** Das Speichern aller Preise (`apply_price_calculation`, ~14.000 Zeilen) braucht länger als das Standard-Limit. Einmalig im SQL Editor:
  ```sql
  alter role service_role set statement_timeout = '120s';
  notify pgrst, 'reload config';
  ```
  (`anon` 3 s und `authenticated` 8 s bleiben.)
- **Passwort-Reset:** Der Recovery-Link wird vor der Supabase-Client-Initialisierung gemerkt (`src/lib/recovery-flag.ts`), sonst fehlt das Formular „Neues Passwort".
- **Sandbox/Live:** `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_test_`/`pk_live_`) bestimmt beim Build den Modus. Der eSIMerge-Sandbox-Katalog hat nur 8 Tarife; mit Sandbox-Token lassen sich nur diese bestellen.
- **Aufräumen nach Tests:** Testbestellungen (`is_sandbox`/`is_test`) lassen sich mit `delete from public.orders where is_sandbox or is_test` entfernen (`esims` folgt per CASCADE). Live-Bestellungen nie pauschal löschen.
- **Backups:** Supabase-Backups und -Plan prüfen (Project Settings → Database → Backups). Kostenlose Projekte werden nach Inaktivität pausiert und haben keine täglichen Backups.

## 8. Datenbank-Sicherung auf dem eigenen Rechner (Windows)
Solange das Supabase-Projekt im Free-Plan läuft (keine täglichen Backups), sichert `scripts/backup-supabase.ps1` die Datenbank in Dateien.
1. Passwortdatei anlegen: `%APPDATA%\postgresql\pgpass.conf` mit einer Zeile
   `aws-0-eu-west-2.pooler.supabase.com:5432:postgres:postgres.<projekt-id>:<datenbank-passwort>`
2. Einmal von Hand starten: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-supabase.ps1`. Ergebnis: Dateien in `%USERPROFILE%\Backups\globesim` und eine Zeile "Fertig." in `backup.log`.
3. Wöchentlich planen (Aufgabenplanung): `schtasks /create /sc weekly /d SUN /st 03:00 /tn "GlobeSIM DB Backup" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Pfad\zum\Repo\scripts\backup-supabase.ps1"`
4. Die Sicherung enthält personenbezogene Daten: nur auf geschütztem Laufwerk, nie im Git-Repo. Storage-Dateien (`blog-covers`) sind nicht enthalten.
5. Wiederherstellung: wie in Abschnitt 2 (zuerst `auth`, dann `public` mit `pg_restore`).
