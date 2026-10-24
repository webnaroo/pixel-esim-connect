-- GlobeMoney von Hand buchen (Admin): Gutschrift oder Abzug mit Grund. Jede Buchung bleibt als eigene Zeile erhalten.
-- Zugriff nur über Serverfunktionen (service_role); Kunden lesen oder schreiben die Tabelle nie direkt.
CREATE TABLE public.loyalty_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount <> 0 AND abs(amount) <= 500),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 200),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX loyalty_adjustments_user_idx ON public.loyalty_adjustments (user_id, created_at DESC);
ALTER TABLE public.loyalty_adjustments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.loyalty_adjustments TO service_role;

-- Kontostand wie in 0033, plus die Buchungen von Hand.
CREATE OR REPLACE FUNCTION public.loyalty_balance(_user uuid, _exclude_order uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    COALESCE((SELECT sum(credit_earned) FROM public.orders
              WHERE user_id = _user AND NOT is_test
                AND status IN ('paid','fulfilling','fulfilled','needs_review')), 0)
    + COALESCE((SELECT sum(amount) FROM public.loyalty_adjustments WHERE user_id = _user), 0)
    - COALESCE((SELECT sum(credit_used) FROM public.orders
                WHERE user_id = _user AND NOT is_test AND credit_used > 0
                  AND (_exclude_order IS NULL OR id <> _exclude_order)
                  AND (status IN ('paid','fulfilling','fulfilled','needs_review','fulfillment_failed','payment_mismatch')
                       OR (status = 'pending' AND created_at > now() - interval '24 hours'))), 0),
    0);
$function$;

REVOKE EXECUTE ON FUNCTION public.loyalty_balance(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_balance(uuid, uuid) TO service_role;
