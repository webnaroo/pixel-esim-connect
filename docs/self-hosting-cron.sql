-- Geplante Jobs für das eigene Supabase-Projekt (SQL Editor, einmalig ausführen).
-- Wichtig: Jeder Aufruf hat timeout_milliseconds := 60000. Der Standard von pg_net sind 5 Sekunden, und die App braucht oft länger (dann steht in net._http_response nur 'Timeout').
-- Voraussetzung: Database → Extensions → pg_cron und pg_net aktiviert.
-- Die Jobs rufen die App mit dem Token aus public.internal_secrets (Zeile 'cron') auf; die App prüft es selbst.

-- 1) Adresse der App (ohne Schrägstrich am Ende). Die alte Lovable-Adresse muss ersetzt werden.
update public.internal_secrets set value = 'https://globesim.de' where name = 'cron_url';

-- 2) eSIM-Status alle 5 Minuten (Fallback, eSIMerge hat keine Webhooks).
select cron.schedule('esim-status-poll', '*/5 * * * *', $job$
  select net.http_post(
    url := (select value from public.internal_secrets where name = 'cron_url') || '/api/public/cron/esim-status-poll',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select value from public.internal_secrets where name = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- 3) Wechselkurse alle 6 Stunden (EZB).
select cron.schedule('fx-refresh', '7 */6 * * *', $job$
  select net.http_post(
    url := (select value from public.internal_secrets where name = 'cron_url') || '/api/public/cron/fx-refresh',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select value from public.internal_secrets where name = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- 4) Katalog-Sync einmal täglich (Uhrzeit nach Bedarf anpassen).
select cron.schedule('catalog-sync', '15 3 * * *', $job$
  select net.http_post(
    url := (select value from public.internal_secrets where name = 'cron_url') || '/api/public/cron/catalog-sync',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select value from public.internal_secrets where name = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- 'fulfillment-retry' (alle 30 s) legt die Datenbank selbst an, sobald eine Bestellung wartet (arm_fulfillment_retry).
-- Prüfen: select jobname, schedule, active from cron.job;

-- 5) Mitteilung "eSIM läuft bald ab" (Android-App), stündlich. Vorher drizzle/migrations/0031_esim_expiry_alert.sql ausführen.
select cron.schedule('esim-expiry-alerts', '25 * * * *', $job$
  select net.http_post(
    url := (select value from public.internal_secrets where name = 'cron_url') || '/api/public/cron/esim-expiry-alerts',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select value from public.internal_secrets where name = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);

-- 6) IndexNow: neue und geänderte Seiten an Bing & Co. melden, täglich. Beim ersten Lauf gehen alle Sitemap-Seiten raus.
select cron.schedule('indexnow', '40 4 * * *', $job$
  select net.http_post(
    url := (select value from public.internal_secrets where name = 'cron_url') || '/api/public/cron/indexnow',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select value from public.internal_secrets where name = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$job$);
