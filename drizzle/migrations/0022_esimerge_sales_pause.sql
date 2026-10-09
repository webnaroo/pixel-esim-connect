DROP POLICY IF EXISTS "admin settings update" ON public.app_settings;
DROP POLICY IF EXISTS "admin settings write" ON public.app_settings;
DROP POLICY IF EXISTS "public settings read" ON public.app_settings;
CREATE POLICY "admin settings update" ON public.app_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND key NOT IN ('shop_enabled','sales_paused','sales_pause'))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND key NOT IN ('shop_enabled','sales_paused','sales_pause'));
CREATE POLICY "admin settings write" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND key NOT IN ('shop_enabled','sales_paused','sales_pause'));
CREATE POLICY "public settings read" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['shop_enabled','sales_paused','vat_rate','default_currency','popular_destinations','site_url','support_hours','unlimited_claim','company_info']));
INSERT INTO public.app_settings (key, value) VALUES ('sales_paused', 'false'::jsonb), ('sales_pause', '{"active":false}'::jsonb) ON CONFLICT (key) DO NOTHING;