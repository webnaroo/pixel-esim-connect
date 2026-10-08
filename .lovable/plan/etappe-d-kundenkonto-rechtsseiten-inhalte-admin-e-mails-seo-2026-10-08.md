# Etappe D – Kundenkonto, Rechtsseiten, Inhalte, Admin, E-Mails, SEO

Hinweis: Der Vergleichsbereich „GlobeSIM im Vergleich“ ist schon fertig (Quelle und Datum Pflicht, nichts ohne Beleg sichtbar). Punkt 8 fällt also weg.

Wegen der Größe wird in 4 Schritten gebaut. Nach jedem Schritt laufen Typprüfung und Tests.

## Schritt 1 – Kundenkonto
- /account mit Reitern: Meine eSIMs, Bestellungen, Einstellungen.
- Meine eSIMs: Status, Restlaufzeit, Verbrauchsbalken nur wenn eSIMerge Verbrauch liefert. Die Installationsdaten (QR, LPA, Code) kommen nur auf Klick „Installationsdaten anzeigen“ und nur nach Prüfung, dass du der Besitzer bist. Sie werden nie geloggt.
- Unlimited-Hinweis mit derselben Regel wie bisher: nur bei none_confirmed mit gültiger Quelle. Der Text kommt aus den Einstellungen.
- Einstellungen: Name, Sprache, Passwort ändern.
- Konto löschen (DSGVO): Bestätigung durch Eintippen von „LÖSCHEN“. Die Bestellungen bleiben aus steuerlichen Gründen erhalten, werden aber anonymisiert (E-Mail → „geloescht-<id>“, keine Verknüpfung zum Nutzer). Die eSIM-Installationsdaten werden geleert, danach wird das Login gelöscht. Dazu gibt es einen Audit-Eintrag ohne personenbezogene Daten.

## Schritt 2 – Rechtsseiten, FAQ, Blog
- Neue Tabelle für die Rechtsseiten: Impressum, Datenschutz, AGB, Widerruf und Rückerstattung. Jede Seite hat einen Text und eine Freigabe.
- Firmendaten als Einstellung: Name, Rechtsform, Anschrift, Vertretung, Registergericht/-nummer, USt-ID, Kontakt. Alle Felder sind anfangs leer, es werden keine Angaben erfunden. Die Texte nutzen Platzhalter wie {company_name}, und leere Felder erscheinen als „[fehlt: Firmenname]“.
- Nicht freigegebene Seiten zeigen öffentlich „Seite nicht gefunden“ (noindex). Admins sehen sie mit dem Banner „Platzhalter, nicht veröffentlichen“.
- Admin „Inhalte“: Rechtsseiten bearbeiten und freigeben, Firmendaten pflegen, FAQ und Blog anlegen, bearbeiten, veröffentlichen.
- FAQ-Regel: Aussagen zu Drosselung, Preisen und Abdeckung nur über Platzhalter aus der Datenbank, nämlich {min_price}, {destination_count} und {unlimited_claim}. Beim Speichern prüft das System, ob feste Euro-Beträge oder „ohne Drosselung“ im Text stehen. Wenn ja, wird das Speichern abgelehnt.
- Blog: /blog und /blog/$slug, nur veröffentlichte Beiträge.

## Schritt 3 – Restlicher Admin und E-Mails
- Neue Reiter: Kunden, eSIMs, Tarife, Logs (API-Logs, Sync-Läufe, Webhooks), Audit-Log. Die Bestellungen bekommen einen Filter, auch für needs_review.
- Alle Listen bekommen Suche, Statusfilter und Seiten. Aktivierungscodes und LPA werden nie geladen oder angezeigt.
- E-Mails: Absender-Domain als Admin-Einstellung. Solange keine Domain verifiziert ist, wird nichts an Kunden gesendet. Die Bestellung zeigt dann „E-Mail ausstehend“, der Admin sieht einen Hinweis, und die Admin-Checkliste bekommt den Punkt „E-Mail-Domain“.
- Die Vorlagen für Bestätigung, Installationslink und Fehler werden vorbereitet. Echter Versand beginnt erst, wenn du die Domain eingerichtet hast. Den Einrichtungsdialog öffne ich dir, sobald du sie hast.

## Schritt 4 – SEO, Performance, Barrierefreiheit
- Eigener Titel und eigene Beschreibung je Seite. Strukturierte Produktdaten nur bei Tarifen mit echtem Preis.
- sitemap.xml als Server-Route: nur Seiten mit Inhalt und freigegebene Rechtsseiten. robots.txt ohne Admin, Konto und Checkout.
- Länderseiten ohne kaufbare Tarife bekommen noindex.
- Prüfung mit Browser-Messung (Ladezeit, Bildgrößen) und Barrierefreiheits-Check (axe) bei 1280 und 360 px. Die Ergebnisse bekommst du als Bericht.

## Abschluss
Typprüfung und Tests grün. Browser-Prüfung bei Desktop und 360 px, auch im Admin mit dem Konto info@globesim.de. Dazu eine Liste für deine eigenen Tests und die Go-Live-Checkliste: Stripe live, eSIMerge live, Domain, E-Mail-Domain, Rechtstexte und Firmendaten, Admin-Konto, Wechselkurs USD→EUR, Shop-Schalter.

## Technisch
- Migrationen: legal_pages (slug, body_md, published, updated_by), app_settings-Schlüssel company_info und email_settings, orders.email_status (pending_domain|sent|failed), blog_posts-Policies für Admin, RLS bleibt wie bisher.
- delete_my_account als Server-Funktion (requireSupabaseAuth). Die Anonymisierung läuft im Admin-Client nach der Prüfung, dass du der Besitzer bist. Am Ende steht auth.admin.deleteUser.
- Reine Regeln mit Tests: src/lib/legal.ts (Platzhalter füllen), src/lib/faq-rules.ts (verbotene feste Aussagen), src/lib/anonymize.ts, src/lib/email-rules.ts (Versand nur mit verifizierter Domain).
