-- Public catalog: only released columns, only active and priced plans. Runs with owner rights so the base table stays closed.
CREATE OR REPLACE VIEW public.public_plans WITH (security_invoker = false) AS
SELECT id, destination_id, type, data_mb, validity_days, network_type, networks, hotspot, voice_sms, fair_use, top_upable,
       sell_price, currency, badge,
       CASE WHEN throttle_claim = 'none_confirmed' THEN 'none_confirmed' ELSE 'unknown' END AS throttle_claim,
       updated_at
FROM public.plans
WHERE is_active AND sell_price > 0;
GRANT SELECT ON public.public_plans TO anon, authenticated;
GRANT SELECT ON public.public_plans TO service_role;

-- Base table: no direct reads for visitors or normal users (cost prices, provider raw text, review fields).
REVOKE SELECT ON public.plans FROM anon, authenticated;
REVOKE SELECT (id, provider, destination_id, type, data_mb, validity_days, network_type, networks, hotspot, voice_sms, fair_use, top_upable, sell_price, currency, badge, is_active, updated_at) ON public.plans FROM anon, authenticated;
DROP POLICY IF EXISTS "plans public read" ON public.plans;
COMMENT ON TABLE public.plans IS 'Server-only (service role). Public reads go through public.public_plans.';