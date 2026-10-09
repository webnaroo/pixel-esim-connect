CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value > 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  times_used integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin-managed via server functions (service_role); no client access.
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.discount_codes TO service_role;

-- Atomic redemption: increments usage only when the code is still valid.
CREATE OR REPLACE FUNCTION public.claim_discount_code(_code text)
RETURNS TABLE (id uuid, code text, type text, value numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.discount_codes d
     SET times_used = d.times_used + 1
   WHERE d.code = upper(_code)
     AND d.active
     AND (d.valid_until IS NULL OR d.valid_until > now())
     AND (d.max_uses IS NULL OR d.times_used < d.max_uses)
  RETURNING d.id, d.code, d.type, d.value;
$function$;
REVOKE EXECUTE ON FUNCTION public.claim_discount_code(text) FROM anon, authenticated;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;