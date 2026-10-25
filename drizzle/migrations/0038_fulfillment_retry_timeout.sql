-- Der Job fulfillment-retry liefert jetzt auch neu bezahlte Bestellungen aus (der Stripe-Webhook tut es nicht mehr).
-- Die Anbieter-Bestellung kann länger als die Standardzeit von pg_net (5 s) dauern: Zeitlimit auf 60 s setzen.
CREATE OR REPLACE FUNCTION public.arm_fulfillment_retry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fulfillment-retry') THEN RETURN; END IF;
  PERFORM cron.schedule('fulfillment-retry', '* * * * *', $job$
    SELECT net.http_post(
      url := (SELECT value FROM public.internal_secrets WHERE name = 'cron_url') || '/api/public/cron/fulfillment-retry',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT value FROM public.internal_secrets WHERE name = 'cron')),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000);
  $job$);
END $$;

-- Einen bereits angelegten Job entfernen, damit er beim nächsten Mal mit dem neuen Zeitlimit entsteht.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fulfillment-retry') THEN PERFORM cron.unschedule('fulfillment-retry'); END IF;
END $$;
