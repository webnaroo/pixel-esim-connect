-- GlobeMoney: Guthaben pro Kauf. Alles wird aus der Tabelle orders abgeleitet; es gibt kein zweites Konto, das auseinanderlaufen kann.
--   credit_earned = Gutschrift dieser Bestellung (null = noch nicht vergeben). Zählt nur bei bezahlten, nicht erstatteten Echt-Bestellungen.
--   credit_used   = bei dieser Bestellung eingesetztes Guthaben. Bei stornierten, abgelaufenen oder erstatteten Bestellungen ist es wieder frei.
-- Statuslisten und Regeln: src/lib/loyalty.ts (EARN_STATUSES, RESERVE_STATUSES, PENDING_HOLD_HOURS). Ändere beide gemeinsam.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS credit_earned numeric(10,2) CHECK (credit_earned IS NULL OR credit_earned >= 0),
  ADD COLUMN IF NOT EXISTS credit_used numeric(10,2) NOT NULL DEFAULT 0 CHECK (credit_used >= 0);

CREATE INDEX IF NOT EXISTS orders_user_loyalty_idx ON public.orders (user_id) WHERE user_id IS NOT NULL;

-- Verfügbares Guthaben eines Kontos. _exclude_order: eine Bestellung, deren eigene Reservierung nicht mitzählt.
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
    - COALESCE((SELECT sum(credit_used) FROM public.orders
                WHERE user_id = _user AND NOT is_test AND credit_used > 0
                  AND (_exclude_order IS NULL OR id <> _exclude_order)
                  AND (status IN ('paid','fulfilling','fulfilled','needs_review','fulfillment_failed','payment_mismatch')
                       OR (status = 'pending' AND created_at > now() - interval '24 hours'))), 0),
    0);
$function$;

-- Guthaben für eine offene Bestellung reservieren. Pro Konto nacheinander (Sperre), damit zwei gleichzeitige
-- Kassen dasselbe Guthaben nicht doppelt einsetzen. Gibt den tatsächlich reservierten Betrag zurück (0 = nichts).
CREATE OR REPLACE FUNCTION public.claim_loyalty_credit(_order uuid, _requested numeric, _max numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o record;
  avail numeric;
  granted numeric;
BEGIN
  SELECT id, user_id, is_test, status INTO o FROM public.orders WHERE id = _order;
  IF NOT FOUND OR o.user_id IS NULL OR o.is_test OR o.status <> 'pending' THEN
    RETURN 0;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('loyalty:' || o.user_id::text, 0));
  avail := public.loyalty_balance(o.user_id, _order);
  granted := floor(least(coalesce(_requested, 0), coalesce(_max, 0), avail) * 100) / 100;
  IF granted <= 0 THEN
    RETURN 0;
  END IF;
  UPDATE public.orders SET credit_used = granted WHERE id = _order AND status = 'pending';
  RETURN granted;
END;
$function$;

-- Nur der Server (service_role). PUBLIC muss ausdrücklich entzogen werden, sonst erbt anon das Recht.
REVOKE EXECUTE ON FUNCTION public.loyalty_balance(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_loyalty_credit(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_balance(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_loyalty_credit(uuid, numeric, numeric) TO service_role;
