-- Rabattcode-Funktionen dürfen nur der Server (service_role) ausführen.
-- Das frühere REVOKE ... FROM anon, authenticated reichte nicht: Postgres gibt EXECUTE standardmäßig an PUBLIC,
-- und anon erbt von PUBLIC. Dadurch konnte jeder mit dem öffentlichen Schlüssel Codes verbrauchen oder zurückgeben.
REVOKE EXECUTE ON FUNCTION public.claim_discount_code(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_discount_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_discount_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_discount_code(text) TO service_role;
