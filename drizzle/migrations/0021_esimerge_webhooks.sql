CREATE TABLE public.provider_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  delivery_id text,
  event_type text NOT NULL,
  payload jsonb,
  signature_valid boolean NOT NULL DEFAULT true,
  mode text NOT NULL CHECK (mode IN ('sandbox','live')),
  order_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','ignored','failed')),
  error text
);
GRANT SELECT ON public.provider_webhook_events TO authenticated;
GRANT ALL ON public.provider_webhook_events TO service_role;
ALTER TABLE public.provider_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read webhook events" ON public.provider_webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX provider_webhook_events_status_idx ON public.provider_webhook_events (status, received_at DESC);

ALTER TABLE public.esims ADD COLUMN activated_at timestamptz, ADD COLUMN usage_threshold integer, ADD COLUMN usage_alerts_sent integer[] NOT NULL DEFAULT '{}';
GRANT SELECT (activated_at, usage_threshold) ON public.esims TO authenticated;