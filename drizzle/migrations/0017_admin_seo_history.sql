CREATE TABLE public.seo_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid,
 kind text NOT NULL CHECK (kind IN ('analysis','audit','change')),
 status text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed','cancelled')),
 title text NOT NULL,
 input_report text,
 pages text[] NOT NULL DEFAULT '{}',
 result jsonb,
 error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_runs TO authenticated;
GRANT ALL ON public.seo_runs TO service_role;
ALTER TABLE public.seo_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY seo_admin_read ON public.seo_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX seo_runs_recent ON public.seo_runs(created_at DESC);
CREATE TABLE public.seo_ai_state (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 blocked boolean NOT NULL DEFAULT false,
 reason text,
 status_code integer,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_ai_state TO authenticated;
GRANT ALL ON public.seo_ai_state TO service_role;
ALTER TABLE public.seo_ai_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY seo_ai_admin_read ON public.seo_ai_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.log_seo_content_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; old_r jsonb; path text; label text;
BEGIN
 r := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP = 'UPDATE' THEN
  old_r := to_jsonb(OLD);
  IF (r - 'updated_at') = (old_r - 'updated_at') THEN RETURN NEW; END IF;
 END IF;
 path := CASE TG_TABLE_NAME
  WHEN 'blog_posts' THEN '/blog/' || (r->>'slug')
  WHEN 'legal_pages' THEN '/legal/' || (r->>'slug')
  WHEN 'faqs' THEN '/faq'
  WHEN 'destinations' THEN CASE WHEN r->>'type' = 'country' THEN '/countries/' ELSE '/regions/' END || (r->>'slug')
 END;
 label := COALESCE(r->>'title', r->>'question', r->>'name_de', r->>'slug', TG_TABLE_NAME);
 INSERT INTO public.seo_runs(actor_id, kind, title, pages, result)
 VALUES(auth.uid(), 'change', left(label, 200), ARRAY[path], jsonb_build_object('source', TG_TABLE_NAME, 'operation', TG_OP, 'note', 'Inhalt geändert; technische SEO-Prüfung separat ausführen.'));
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_seo_content_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seo_blog_change AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.log_seo_content_change();
CREATE TRIGGER seo_legal_change AFTER INSERT OR UPDATE OR DELETE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.log_seo_content_change();
CREATE TRIGGER seo_faq_change AFTER INSERT OR UPDATE OR DELETE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.log_seo_content_change();
CREATE TRIGGER seo_destination_change AFTER INSERT OR UPDATE OR DELETE ON public.destinations FOR EACH ROW EXECUTE FUNCTION public.log_seo_content_change();