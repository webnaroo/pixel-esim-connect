-- lovable-cron-fallback-reviewed: job exists only while delivery retries are pending (armed on enqueue, unscheduled after drain); 1-minute tick needed for the required 1/5/25-minute retry timing
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
      body := '{}'::jsonb);
  $job$);
END $$;

CREATE OR REPLACE FUNCTION public.disarm_fulfillment_retry_if_drained()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE status IN ('paid','fulfilling') AND next_attempt_at IS NOT NULL) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fulfillment-retry') THEN PERFORM cron.unschedule('fulfillment-retry'); END IF;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.arm_fulfillment_retry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.disarm_fulfillment_retry_if_drained() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arm_fulfillment_retry() TO service_role;
GRANT EXECUTE ON FUNCTION public.disarm_fulfillment_retry_if_drained() TO service_role;

CREATE OR REPLACE FUNCTION public.orders_arm_retry_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.arm_fulfillment_retry();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.orders_arm_retry_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_arm_retry ON public.orders;
CREATE TRIGGER orders_arm_retry AFTER INSERT OR UPDATE OF next_attempt_at ON public.orders
  FOR EACH ROW WHEN (NEW.next_attempt_at IS NOT NULL) EXECUTE FUNCTION public.orders_arm_retry_trigger();