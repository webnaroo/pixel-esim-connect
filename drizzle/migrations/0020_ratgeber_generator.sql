ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_image_alt text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS quality_score integer,
  ADD COLUMN IF NOT EXISTS quality_report jsonb,
  ADD COLUMN IF NOT EXISTS generation_meta jsonb,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'guide',
  ADD COLUMN IF NOT EXISTS target_words integer NOT NULL DEFAULT 1400,
  ADD COLUMN IF NOT EXISTS internal_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS score_override_reason text;
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_status_check CHECK (status IN ('draft','review','scheduled','published','archived'));
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_post_type_check CHECK (post_type IN ('guide','explainer','howto','comparison'));

DROP POLICY IF EXISTS "blog public read" ON public.blog_posts;
CREATE POLICY "blog public read" ON public.blog_posts FOR SELECT
  USING ((status IN ('published','scheduled') AND published_at IS NOT NULL AND published_at <= now()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.blog_post_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  actor_id uuid,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_post_versions_post_idx ON public.blog_post_versions(post_id, created_at DESC);
GRANT SELECT ON public.blog_post_versions TO authenticated;
GRANT ALL ON public.blog_post_versions TO service_role;
ALTER TABLE public.blog_post_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog versions admin read" ON public.blog_post_versions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));