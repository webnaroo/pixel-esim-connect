-- lovable-cron-fallback-reviewed: retry job is armed only while an order waits for eSIMerge and unscheduled after drain; 30 s cadence is the owner's required fallback timing
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'expired';

CREATE OR REPLACE FUNCTION public.arm_fulfillment_retry()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fulfillment-retry' AND schedule = '30 seconds') THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fulfillment-retry') THEN PERFORM cron.unschedule('fulfillment-retry'); END IF;
  PERFORM cron.schedule('fulfillment-retry', '30 seconds', $job$
    SELECT net.http_post(
      url := (SELECT value FROM public.internal_secrets WHERE name = 'cron_url') || '/api/public/cron/fulfillment-retry',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT value FROM public.internal_secrets WHERE name = 'cron')),
      body := '{}'::jsonb);
  $job$);
END $function$;