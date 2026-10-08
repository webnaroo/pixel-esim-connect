-- shop_enabled may only be changed by the server after the checklist passes (service role bypasses RLS).
DROP POLICY IF EXISTS "admin settings update" ON public.app_settings;
DROP POLICY IF EXISTS "admin settings write" ON public.app_settings;
CREATE POLICY "admin settings update" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND key <> 'shop_enabled')
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND key <> 'shop_enabled');
CREATE POLICY "admin settings write" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND key <> 'shop_enabled');
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON public.sync_runs (started_at DESC);