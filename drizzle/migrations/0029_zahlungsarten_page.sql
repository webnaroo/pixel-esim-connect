ALTER TABLE public.legal_pages DROP CONSTRAINT legal_pages_slug_check;
ALTER TABLE public.legal_pages ADD CONSTRAINT legal_pages_slug_check CHECK (slug = ANY (ARRAY['impressum','datenschutz','agb','widerruf','rueckerstattung','zahlungsarten']));
INSERT INTO public.legal_pages (slug, title, body_md, published) VALUES ('zahlungsarten', 'Zahlungsarten', $md$
Die Zahlung erfolgt über unseren Zahlungsdienstleister Stripe. Welche der folgenden Zahlungsarten dir in der Kasse angezeigt werden, hängt von deinem Gerät, deinem Land und dem Bestellwert ab.

## Kredit- und Debitkarte

Du kannst mit Visa, Mastercard und weiteren gängigen Karten bezahlen. Die Belastung erfolgt mit Abschluss der Bestellung.

## Apple Pay

Auf unterstützten Apple-Geräten kannst du mit Apple Pay bezahlen. Die Zahlung bestätigst du auf deinem Gerät.

## Google Pay

Sie können im Rahmen des Bestellvorgangs mit Google Pay bezahlen. Hierfür müssen Sie die Zahlung über die mobile App „Google Pay“ auf einem unterstützten Endgerät unter Einhaltung von Verifizierungsschritten bestätigen. Google Pay verwendet für die Transaktion die von Ihnen in der App hinterlegten Zahlungsdaten. Weitere Informationen finden Sie unter https://support.google.com/pay/merchants/answer/6345242?hl=de

## Klarna

**Achtung! Kreditaufnahme kostet Geld.**

In Zusammenarbeit mit der Klarna Bank AB (publ), Sveavägen 46, 111 34 Stockholm, Schweden, bieten wir die folgenden Zahlungsoptionen an. Die Zahlung erfolgt jeweils an Klarna:

- **Rechnung:** Die Zahlungsfrist beträgt 30 Tage ab Abschluss der Bestellung. Den genauen Fälligkeitstermin teilt Ihnen Klarna mit. Die Rechnungsbedingungen für Deutschland finden Sie unter https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_de/invoice?fee=0 und für Österreich unter https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_at/invoice?fee=0.
- **In 3 Raten bezahlen:** Sie bezahlen den Gesamtbetrag in drei Raten. Die erste Rate wird bei Abschluss der Bestellung fällig, die beiden weiteren Raten jeweils 30 Tage später. Ihren Zahlungsplan erhalten Sie von Klarna per E-Mail.
- **Sofort bezahlen:** Sie bezahlen per Sofortüberweisung, Lastschrift oder Karte. Ihr Konto wird zeitnah nach Abgabe der Bestellung belastet.

Die Nutzung der Zahlungsarten Rechnung und In 3 Raten bezahlen setzt eine positive Bonitätsprüfung voraus. Insofern leiten wir Ihre Daten im Rahmen der Kaufanbahnung und Abwicklung des Kaufvertrages an Klarna zum Zwecke der Adress- und Bonitätsprüfung weiter. Bitte haben Sie Verständnis dafür, dass wir Ihnen nur diejenigen Zahlarten anbieten können, die aufgrund der Ergebnisse der Bonitätsprüfung zulässig sind.

Bei verspäteter Zahlung können nach den Bedingungen von Klarna Mahngebühren anfallen. Weitere Informationen und Klarnas Nutzungsbedingungen für Deutschland finden Sie hier: https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_de/user und für Österreich hier: https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_at/user.

Allgemeine Informationen zu Klarna erhalten Sie hier: www.klarna.com. Ihre personenbezogenen Daten werden von Klarna in Übereinstimmung mit den geltenden Datenschutzbestimmungen und entsprechend den Angaben in Klarnas Datenschutzbestimmungen für Deutschland (https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_de/privacy) bzw. Österreich (https://cdn.klarna.com/1.0/shared/content/legal/terms/0/de_at/privacy) behandelt.

## Bancontact und eps

Kunden aus Belgien bzw. Österreich können außerdem per Bancontact bzw. eps-Überweisung bezahlen. Die Bestätigung erfolgt über deine Bank.
$md$, true)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, body_md = EXCLUDED.body_md, published = true;