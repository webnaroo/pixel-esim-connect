# Preisänderungen zuverlässig anzeigen

## Diagnose – ohne Änderungen an Preisen
- Eine Margenregel wird gespeichert und anschließend werden Verkaufspreise neu berechnet. Die gesonderten Stripe-Gebühren werden bisher nur gespeichert und für die Ergebnisanzeige verwendet.
- Reihenfolge: Tarif → Land/Region (gleiche Ebene) → Tariftyp → global; innerhalb einer Ebene höchste Priorität. Derzeit gibt es genau eine globale Regel: **55 %**, Rundung **,49/,99**.
- Es gibt aktuell **0 feste Aufschlagsregeln** und keine eigene Kennzeichnung für manuell überschriebenen Verkaufspreis. Einzelne direkte Preisänderungen wären deshalb derzeit nicht zuverlässig als Überschreibung erkennbar.
- Vorschau und globesim.de verwenden dieselbe Lovable-Cloud-Datenbank; Vorschau und veröffentlichter Programmstand können unterschiedlich sein. Separate Test- und Live-Margen existieren nicht.
- Die Reisezielliste hält Preise im Browser **24 Stunden** vor. Detailseiten lesen beim ersten Seitenabruf aus der Datenbank. Der aktuelle öffentliche Abruf liefert `no-cache, must-revalidate, max-age=0`; ein fest veralteter HTML-Stand konnte diesmal nicht reproduziert werden.
- Letzte protokollierte Preisänderung: **09.10.2026, 21:58:30 Berliner Zeit**. Letzter Kataloglauf beendet: **22:40:51**; aktueller USD-Kurs zuletzt abgerufen **20:07:00**. Ein vollständiger Zeitstempel pro Preisberechnung fehlt bisher.
- Fünf Türkei-Tarife stimmen jetzt zwischen Datenbank und öffentlichem HTML überein:

| Tarif | Datenbank | HTML |
|---|---:|---:|
| 1 GB / 7 Tage | 1,99 € | 1,99 € |
| 2 GB / 15 Tage | 2,99 € | 2,99 € |
| 3 GB / 3 Tage | 1,99 € | 1,99 € |
| 3 GB / 5 Tage | 1,99 € | 1,99 € |
| 3 GB / 7 Tage | 2,49 € | 2,49 € |

Die Suchmaschinenangabe der Türkei-Seite enthält ebenfalls **ab 1,99 €**. Durch die Rundung können unterschiedliche Aufschläge zum gleichen Endpreis führen; die Vorschau soll das ausdrücklich zeigen.

## Umsetzung
1. **Speichern mit Vorschau:** Erst anzeigen, wie viele Preise sich ändern oder unverändert bleiben und warum. Erst nach Bestätigung speichern und neu berechnen. Erfolg oder Fehler mit tatsächlicher Anzahl anzeigen; keine Erfolgsmeldung bei unvollständiger Berechnung.
2. **Einheitliche Berechnung:** Bestehende Preisfunktion erweitern, damit Wechselkurs, Puffer, Aufschlag, Steuer, Rundung und Mindestgewinn überall identisch wirken. Alle Berechnungswege verwenden dieselbe Funktion.
3. **Nachvollziehbare Preise:** Preisquelle, letzte Berechnung und Eingangswerte speichern. Eine ausdrückliche manuelle Preisüberschreibung ergänzen und bei Neuberechnung sowie Katalogimport erhalten. Historische Preise ohne Kennzeichnung nicht automatisch zu manuellen Preisen erklären.
4. **Automatische Aktualisierung:** Änderungen aller Preiseingaben lösen die Berechnung aus. Der bestehende EZB-Abruf alle sechs Stunden bleibt. Preisänderungen verändern nicht die Freigabe oder Aktivität eines Tarifs.
5. **Aktuelle Website:** Preisabhängige Browser-Zwischenspeicher auf höchstens 60 Sekunden begrenzen und beim erneuten Öffnen aktualisieren. Bereits offene Seiten regelmäßig aktualisieren. Server-Ausgabe, „ab“-Preis und Suchmaschinenangaben lesen denselben aktuellen Stand.
6. **Kasse:** Aktuellen Preis vor Zahlungsstart serverseitig prüfen; Änderungen gegenüber der Anzeige vor dem Start bestätigen lassen. Bereits gestartete Zahlungen behalten ihren gesperrten Preis.
7. **Admin:** Quelle, Einkauf, Kurs, Aufschlag, Netto/Brutto, Rest und Berechnungszeit anzeigen. Gemeinsame Datenbasis transparent kennzeichnen statt fiktiver getrennter Test-/Live-Regeln. Notfall-Neuberechnung mit Vorschau und Bestätigung, Änderungsprotokoll und Warnung bei veraltetem Berechnungsstand ergänzen.

## Technische Details
- Vorhandene getestete Funktionen in `pricing.ts` und `fx.server.ts` weiterverwenden; keine zweite konkurrierende Preisformel einführen.
- Metadaten additiv ergänzen und sensible Einkaufspreise ausschließlich über admin-geprüfte Serverfunktionen lesen. Öffentliche Ansichten bleiben ohne Einkaufskosten.
- Alle Tariflisten vollständig und stabil paginieren; derzeit sind unter anderem Preis-Prüfliste und Katalog-Bestandserkennung auf eine Datenbankantwort begrenzt.
- Neuberechnung zuverlässig abschließen und Fehler protokollieren. Margenänderung und Berechnung dürfen nicht unbemerkt auseinanderlaufen.

## Prüfung und Grenze
- Tests für Margenänderung, Rundung, Mindestgewinn, manuelle Überschreibung, unveränderte Sichtbarkeit und gesperrte Checkout-Preise ergänzen.
- Server-HTML, Suchmaschinenpreise und Kasse mit fünf Datenbanktarifen vergleichen; Margenwechsel ausschließlich mit isolierten Testdaten prüfen.
- **Keine aktuellen Margen oder Verkaufspreise ändern. Keine echte Zahlung starten. Keine Veröffentlichung ohne Auftrag.** Änderungen, die bestehende Preise neu berechnen würden, werden erst nach deiner Bestätigung ausgeführt.