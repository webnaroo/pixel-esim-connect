CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  website_url text,
  logo_url text CHECK (logo_url IS NULL OR length(logo_url) < 300000),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.comparison_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  globesim_text text NOT NULL DEFAULT '',
  globesim_status text NOT NULL DEFAULT 'neutral' CHECK (globesim_status IN ('check','neutral')),
  requires text CHECK (requires IS NULL OR requires IN ('unlimited_plans','support_hours','destination_count')),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.comparison_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.comparison_rows(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'neutral' CHECK (status IN ('check','neutral','cross')),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  checked_at date NOT NULL DEFAULT current_date,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (row_id, competitor_id)
);
GRANT SELECT ON public.competitors, public.comparison_rows, public.comparison_facts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors, public.comparison_rows, public.comparison_facts TO authenticated;
GRANT ALL ON public.competitors, public.comparison_rows, public.comparison_facts TO service_role;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitors admin" ON public.competitors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "competitors public" ON public.competitors FOR SELECT TO anon, authenticated USING (enabled);
CREATE POLICY "crows admin" ON public.comparison_rows FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "crows public" ON public.comparison_rows FOR SELECT TO anon, authenticated USING (enabled);
CREATE POLICY "cfacts admin" ON public.comparison_facts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "cfacts public valid" ON public.comparison_facts FOR SELECT TO anon, authenticated
  USING (enabled AND source_url ~ '^https://' AND checked_at >= current_date - 90);

CREATE OR REPLACE FUNCTION public.comparison_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, meta)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END::text,
          jsonb_build_object('old', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'logo_url' END, 'new', CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'logo_url' END));
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.comparison_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER competitors_audit AFTER INSERT OR UPDATE OR DELETE ON public.competitors FOR EACH ROW EXECUTE FUNCTION public.comparison_audit();
CREATE TRIGGER crows_audit AFTER INSERT OR UPDATE OR DELETE ON public.comparison_rows FOR EACH ROW EXECUTE FUNCTION public.comparison_audit();
CREATE TRIGGER cfacts_audit AFTER INSERT OR UPDATE OR DELETE ON public.comparison_facts FOR EACH ROW EXECUTE FUNCTION public.comparison_audit();

DROP POLICY IF EXISTS "public settings read" ON public.app_settings;
CREATE POLICY "public settings read" ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY['shop_enabled','vat_rate','default_currency','popular_destinations','site_url','support_hours']));