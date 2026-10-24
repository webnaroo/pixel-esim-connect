-- 1) Buchungen von Hand können für die Stufe zählen (nur Gutschriften; Abzüge senken die Stufe nie).
ALTER TABLE public.loyalty_adjustments ADD COLUMN IF NOT EXISTS counts_for_tier boolean NOT NULL DEFAULT true;

-- 2) Die Teilnahmebedingungen (Entwurf) passen zur neuen Regel: ganze Bestellung mit Guthaben möglich.
UPDATE public.legal_pages
   SET body_md = replace(body_md,
     'Du kannst im Bezahlvorgang bis zu 50 % einer Bestellung mit Guthaben bezahlen. Mindestens 0,50 € müssen immer in bar bezahlt werden.',
     'Du kannst im Bezahlvorgang mit Guthaben bezahlen, auch eine ganze Bestellung, wenn dein Guthaben reicht. Wird nur ein Teil mit Guthaben bezahlt, müssen mindestens 0,50 € in bar bezahlt werden.')
 WHERE slug = 'globemoney' AND NOT published;
