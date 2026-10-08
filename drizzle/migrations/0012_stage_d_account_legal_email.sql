CREATE TABLE public.legal_pages (
  slug text PRIMARY KEY CHECK (slug IN ('impressum','datenschutz','agb','widerruf','rueckerstattung')),
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_pages TO anon;
GRANT SELECT, INSERT, UPDATE ON public.legal_pages TO authenticated;
GRANT ALL ON public.legal_pages TO service_role;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "legal public read" ON public.legal_pages FOR SELECT TO anon, authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "legal admin write" ON public.legal_pages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.orders ADD COLUMN email_status text NOT NULL DEFAULT 'none' CHECK (email_status IN ('none','pending_domain','sent','failed'));
ALTER TABLE public.orders ADD COLUMN anonymized_at timestamptz;

DROP POLICY "public settings read" ON public.app_settings;
CREATE POLICY "public settings read" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['shop_enabled','vat_rate','default_currency','popular_destinations','site_url','support_hours','unlimited_claim','company_info']));