ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawal_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS net numeric,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

-- Atomic claim: only one caller can move a paid order into 'fulfilling'.
CREATE OR REPLACE FUNCTION public.claim_order_for_fulfillment(_order_id uuid, _max_attempts integer)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.orders
     SET status = 'fulfilling', fulfillment_attempts = fulfillment_attempts + 1, next_attempt_at = NULL
   WHERE id = _order_id
     AND status = 'paid'
     AND fulfillment_attempts < _max_attempts
     AND (next_attempt_at IS NULL OR next_attempt_at <= now())
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_order_for_fulfillment(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_for_fulfillment(uuid, integer) TO service_role;