ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_started_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_id text;
CREATE INDEX IF NOT EXISTS orders_auto_refund_idx ON public.orders (failed_at) WHERE status = 'fulfillment_failed' AND refund_started_at IS NULL;
INSERT INTO public.app_settings (key, value) VALUES ('auto_refund_enabled', 'false'::jsonb) ON CONFLICT (key) DO NOTHING;