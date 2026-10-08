-- lovable-cron-fallback-reviewed: eSIMerge has no webhooks; status/usage must be polled every 5 minutes (user requirement)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'needs_review';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;
ALTER TABLE public.sync_runs ADD COLUMN IF NOT EXISTS unmapped jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sync_runs ADD COLUMN IF NOT EXISTS stats jsonb;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS provider_esim_id text;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS provider_status text;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS usage_cache jsonb;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS usage_checked_at timestamptz;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS ios_install_url text;
ALTER TABLE public.esims ADD COLUMN IF NOT EXISTS android_install_url text;
-- install URLs embed the LPA string: server-only like the other activation columns
REVOKE SELECT (ios_install_url, android_install_url) ON public.esims FROM anon, authenticated;
GRANT SELECT (provider_esim_id, provider_status, usage_cache, usage_checked_at) ON public.esims TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'esim-status-poll') THEN
    PERFORM cron.schedule('esim-status-poll', '*/5 * * * *', $job$
      SELECT net.http_post(
        url := (SELECT value FROM public.internal_secrets WHERE name = 'cron_url') || '/api/public/cron/esim-status-poll',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (SELECT value FROM public.internal_secrets WHERE name = 'cron')),
        body := '{}'::jsonb);
    $job$);
  END IF;
END $$;