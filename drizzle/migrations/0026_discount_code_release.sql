CREATE OR REPLACE FUNCTION public.release_discount_code(_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.discount_codes
     SET times_used = GREATEST(times_used - 1, 0)
   WHERE code = upper(_code);
$function$;

REVOKE EXECUTE ON FUNCTION public.release_discount_code(text) FROM anon, authenticated;