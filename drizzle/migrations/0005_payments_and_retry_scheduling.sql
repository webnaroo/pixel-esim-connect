ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'payment_mismatch';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_env text CHECK (stripe_env IN ('sandbox','live'));

-- Server-only secrets read by scheduled jobs and the matching server routes. No client access at all.
CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;
GRANT ALL ON public.internal_secrets TO service_role;
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;

-- Claim: a paid order, or a 'fulfilling' order whose retry is due, or one stuck mid-attempt (>10 min)
-- that has no provider order yet. Exactly one caller wins.
CREATE OR REPLACE FUNCTION public.claim_order_for_fulfillment(_order_id uuid, _max_attempts integer)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.orders o
     SET status = 'fulfilling', fulfillment_attempts = o.fulfillment_attempts + 1, next_attempt_at = NULL
   WHERE o.id = _order_id
     AND o.fulfillment_attempts < _max_attempts
     AND NOT EXISTS (SELECT 1 FROM public.esims e WHERE e.order_id = o.id AND e.provider_order_id IS NOT NULL)
     AND (
       (o.status = 'paid' AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= now()))
       OR (o.status = 'fulfilling' AND o.next_attempt_at IS NOT NULL AND o.next_attempt_at <= now())
       OR (o.status = 'fulfilling' AND o.next_attempt_at IS NULL AND o.updated_at < now() - interval '10 minutes')
     )
  RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.claim_order_for_fulfillment(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_for_fulfillment(uuid, integer) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;