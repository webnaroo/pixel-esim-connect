-- Sensitive tables: no anon access, no client writes; RLS policies decide row visibility.
REVOKE ALL ON public.user_roles, public.esims, public.api_logs, public.provider_raw_samples, public.webhook_events FROM anon, authenticated;
GRANT SELECT ON public.user_roles, public.api_logs, public.provider_raw_samples, public.webhook_events TO authenticated;
-- esims: activation data (activation_code, lpa_string, smdp_address, qr_image_url, direct_install_url, provider_order_id) is server-only.
GRANT SELECT (id, order_id, user_id, provider, iccid, install_status, status, expires_at, created_at, updated_at) ON public.esims TO authenticated;
GRANT ALL ON public.user_roles, public.esims, public.api_logs, public.provider_raw_samples, public.webhook_events TO service_role;

-- Fixed-window rate limiting for public server routes (server-side only).
CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(_bucket text, _window_seconds integer, _max integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
        n integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, window_start, hits) VALUES (_bucket, ws, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO n;
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  RETURN n <= _max;
END $$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;