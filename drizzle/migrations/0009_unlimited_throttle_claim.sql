ALTER TABLE public.plans ADD COLUMN throttle_claim text NOT NULL DEFAULT 'unknown' CHECK (throttle_claim IN ('unknown','none_confirmed','conflict'));
ALTER TABLE public.plans ADD COLUMN throttle_confirmation jsonb;
COMMENT ON COLUMN public.plans.throttle_claim IS 'unknown | none_confirmed (admin-confirmed no throttling, with source) | conflict (provider catalog contradicts confirmation; claim hidden)';
DROP POLICY IF EXISTS "public settings read" ON public.app_settings;
CREATE POLICY "public settings read" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['shop_enabled','vat_rate','default_currency','popular_destinations','site_url','support_hours','unlimited_claim']));