ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS released boolean NOT NULL DEFAULT true;
ALTER TABLE public.plans ALTER COLUMN released SET DEFAULT false;
COMMENT ON COLUMN public.plans.released IS 'New catalog plans stay hidden until an admin releases them.';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_status text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_due_by timestamptz;
CREATE OR REPLACE VIEW public.public_plans WITH (security_invoker = false) AS
 SELECT id, destination_id, type, data_mb, validity_days, network_type, networks, hotspot, voice_sms, fair_use, top_upable, sell_price, currency, badge,
   CASE WHEN throttle_claim = 'none_confirmed'::text THEN 'none_confirmed'::text ELSE 'unknown'::text END AS throttle_claim,
   updated_at
 FROM public.plans
 WHERE is_active AND released AND sell_price > 0::numeric;