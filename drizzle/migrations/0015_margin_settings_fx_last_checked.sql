ALTER TABLE public.fx_rates ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;
UPDATE public.fx_rates SET last_checked_at = fetched_at WHERE last_checked_at IS NULL;