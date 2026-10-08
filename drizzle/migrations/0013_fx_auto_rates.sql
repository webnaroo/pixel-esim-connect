ALTER TABLE public.fx_rates ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending_review','rejected'));
ALTER TABLE public.fx_rates ADD COLUMN fetched_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.fx_rates ADD COLUMN published_at date;
ALTER TABLE public.fx_rates ADD COLUMN expires_at timestamptz;
ALTER TABLE public.fx_rates ADD COLUMN reason text;
ALTER TABLE public.fx_rates ADD COLUMN decided_by uuid;
ALTER TABLE public.fx_rates ADD COLUMN source_rate numeric;
CREATE INDEX IF NOT EXISTS fx_rates_lookup ON public.fx_rates (from_currency, to_currency, status, fetched_at DESC);
ALTER TABLE public.orders ADD COLUMN fx_rate numeric;
ALTER TABLE public.orders ADD COLUMN cost_amount numeric;
ALTER TABLE public.orders ADD COLUMN cost_currency text;
ALTER TABLE public.orders ADD COLUMN price_frozen_until timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fx-refresh') THEN
    PERFORM cron.schedule('fx-refresh', '7 */6 * * *', $job$
      SELECT net.http_post(
        url := (SELECT value FROM public.internal_secrets WHERE name = 'cron_url') || '/api/public/cron/fx-refresh',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT value FROM public.internal_secrets WHERE name = 'cron')),
        body := '{}'::jsonb);
    $job$);
  END IF;
END $$;