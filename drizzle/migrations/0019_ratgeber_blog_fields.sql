ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS answer_summary text,
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS country_code text;
UPDATE public.blog_posts SET status = 'published' WHERE published_at IS NOT NULL;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_status_check CHECK (status IN ('draft','published'));
DROP TRIGGER IF EXISTS blog_posts_updated ON public.blog_posts;
CREATE TRIGGER blog_posts_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP POLICY IF EXISTS "blog public read" ON public.blog_posts;
CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT USING (((status = 'published') AND (published_at IS NOT NULL) AND (published_at <= now())) OR public.has_role(auth.uid(), 'admin'::app_role));