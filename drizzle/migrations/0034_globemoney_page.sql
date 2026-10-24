-- Seite "GlobeMoney" (Teilnahmebedingungen). Wird NICHT veröffentlicht: Entwurf zum rechtlichen Prüfen und Anpassen im Admin.
ALTER TABLE public.legal_pages DROP CONSTRAINT legal_pages_slug_check;
ALTER TABLE public.legal_pages ADD CONSTRAINT legal_pages_slug_check CHECK (slug = ANY (ARRAY['impressum','datenschutz','agb','widerruf','rueckerstattung','zahlungsarten','globemoney']));
INSERT INTO public.legal_pages (slug, title, body_md, published) VALUES ('globemoney', 'GlobeMoney: Teilnahmebedingungen', $md$
*Entwurf. Vor der Veröffentlichung rechtlich und steuerlich prüfen lassen und anpassen.*

## Was ist GlobeMoney?

Mit GlobeMoney erhältst du bei jedem Kauf Guthaben, das du bei einem späteren Kauf im GlobeSIM-Shop einsetzen kannst. Das Programm ist für Kundinnen und Kunden mit Konto.

## Stufen und Gutschrift

Du erhältst auf den Betrag, den du bei einer Bestellung bezahlst, eine Gutschrift in Prozent. Die Höhe richtet sich nach deinem bisherigen Gesamtumsatz:

- Reisender (ab dem ersten Kauf): 5 %
- Silber-Reisender (ab 18 € Gesamtumsatz): 6 %
- Gold-Reisender (ab 60 € Gesamtumsatz): 7 %
- Platin-Reisender (ab 140 € Gesamtumsatz): 10 %

Die Gutschrift wird vergeben, sobald die Zahlung bestätigt ist. Für den Teil einer Bestellung, den du mit Guthaben bezahlst, gibt es keine Gutschrift.

## Guthaben einsetzen

Du kannst im Bezahlvorgang bis zu 50 % einer Bestellung mit Guthaben bezahlen. Mindestens 0,50 € müssen immer in bar bezahlt werden. Das Guthaben gilt nur im GlobeSIM-Shop. Es kann nicht ausgezahlt, übertragen oder gegen Bargeld getauscht werden.

## Stornierung und Erstattung

Wird eine Bestellung storniert oder erstattet, entfällt die Gutschrift für diese Bestellung. Bei dieser Bestellung eingesetztes Guthaben wird dir wieder gutgeschrieben.

## Missbrauch und Änderungen

Bei Missbrauch (zum Beispiel mehrere Konten, um Gutschriften zu erschleichen) kann Guthaben gesperrt oder entfernt werden. Änderungen am Programm kündigen wir vorher an.
$md$, false)
ON CONFLICT (slug) DO NOTHING;
