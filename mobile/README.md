# GlobeSIM App – iPhone (App Store) und Android (Google Play)

Diese Mappe enthält eine fertige App-Hülle um die bestehende Webseite **https://globesim.de**.
Die Webseite selbst wird **nicht** verändert. Die App öffnet sie im Vollbild und legt das
Nötige obendrauf: App-Icon, Startbild, Statusleiste in Markenfarben, Android-Zurück-Knopf
und eine eigene Seite „Keine Verbindung".

| Datei / Ordner | Was drin ist |
| --- | --- |
| `capacitor.config.json` | App-Name „GlobeSIM", Kennung `de.globesim.app`, Ziel-URL `https://globesim.de` |
| `www/index.html` | Die Seite „Keine Verbindung" mit Knopf „Erneut versuchen" |
| `assets/icon-source.png` | Vorlage für das App-Icon (1024 × 1024) |
| `assets/splash-source.png` | Vorlage für das Startbild (2732 × 2732) |
| `android/` | Echtes Android-Studio-Projekt, Icon und Startbild schon eingesetzt |
| `ios/` | Echtes Xcode-Projekt, Icon und Startbild schon eingesetzt |
| `store/` | Fertige Texte für App Store und Google Play |

---

## Vor dem Bauen: zwei Entscheidungen

**1. Bezahlen in der App.**
Apple und Google verlangen für digitale Waren – dazu zählen eSIM-Daten – ihre eigene
Abrechnung. Apple behält 15–30 %. Zwei Wege:

- **Kauf in der App über Apple/Google-Abrechnung.** Teuer, aber der sichere Weg durch die Prüfung.
- **App zum Ansehen und Verwalten, Kauf auf der Webseite.** Billig, aber Apple kann das als
  Umgehung seiner Abrechnung werten und ablehnen.

**2. Ohne eigenen Nutzen wird Apple ablehnen.**
Eine App, die nur eine Webseite anzeigt, fällt unter Apples Richtlinie 4.2
 („zu wenig Funktionsumfang"). Der übliche Weg durch die Prüfung sind echte
 Gerätefunktionen, am einfachsten **Push-Mitteilungen**: „deine eSIM ist bereit",
 „80 % deines Datenvolumens verbraucht". Das ist für Kunden ein echter Gewinn und
 für die Prüfung ein echtes Argument. Die Mitteilungen sind noch nicht eingebaut –
 sie brauchen ein Apple- und ein Google-Zertifikat. Sag Bescheid, dann baue ich sie ein.

---

## Voraussetzungen

- **Node.js 20 oder neuer**
- **Android:** Android Studio (läuft auf Windows, Mac oder Linux), enthält Java 17 und das Android-SDK
- **iPhone:** ein Mac mit Xcode 15 oder neuer – für iPhone-Apps gibt es keinen Weg ohne Mac
- **Konten:** Apple Developer Program (99 $ im Jahr), Google Play Console (25 $ einmalig)

## Loslegen

```bash
cd mobile
npm install
npx cap sync
```

`npx cap sync` kopiert Icon, Startbild und Einstellungen in beide Projektordner.
Das immer wiederholen, wenn sich `capacitor.config.json` oder eines der Bilder ändert.

---

## Android – fertige Datei für Google Play

1. `npx cap open android` – öffnet Android Studio.
2. **Build → Generate Signed Bundle / APK** → *Android App Bundle* → **Create new** Keystore.
   Die Keystore-Datei und ihr Passwort **sicher aufbewahren**: ohne sie kann die App
   später nie aktualisiert werden.
3. In `android/app/build.gradle` `versionCode` und `versionName` erhöhen
   (bei jedem Upload `versionCode` um 1 höher).
4. **Build → Build Bundle(s) / APK(s) → Build Bundle(s)** → Modus *release*.
   Die Datei liegt danach unter
   `android/app/build/outputs/bundle/release/app-release.aab`.
5. Play Console: App anlegen, AAB hochladen, „Daten zur Datensicherheit" ausfüllen,
   dann **geschlossener Test** mit 12 echten Testern über 14 Tage – diese Pflicht macht
   Google bei neuen Konten. Danach auf „Produktion".

## iPhone – fertig für den App Store

Alles davon läuft auf einem Mac.

1. `npx cap open ios` – öffnet Xcode. (Fehlt CocoaPods: `sudo gem install cocoapods`.)
2. Projekt antippen → Target **App** → Reiter **Signing & Capabilities** → **Team** auf
   deine Apple-ID stellen. Xcode richtet die Signatur dann selbst ein.
3. **Product → Archive**.
4. Im Fenster **Distribute App → App Store Connect → Upload**.
5. App Store Connect: App „GlobeSIM" mit Kennung `de.globesim.app` anlegen, Texte und
   Screenshots eintragen, Datenschutz-Fragebogen ausfüllen, zur Prüfung einreichen.
   (`ITSAppUsesNonExemptEncryption` ist schon auf „nein" gesetzt – die Export-Frage
   entfällt damit.)

---

## Nach einer Änderung an der Webseite

Nichts tun. Die App holt sich die Seite jedes Mal live von `https://globesim.de`.
Nur wenn sich `capacitor.config.json` oder die Bilder ändern: `npx cap sync` und neu bauen.

## Wenn etwas nicht klappt

| Meldung | Ursache und Lösung |
| --- | --- |
| Xcode: „No signing certificate" | Team nicht gewählt, oder Apple-Developer-Konto fehlt noch |
| Xcode: „CocoaPods not installed" | Auf dem Mac `sudo gem install cocoapods`, dann `npx cap sync ios` |
| Android Studio: „Keystore password was incorrect" | Falsche Keystore-Datei oder falsches Passwort |
| App bleibt weiß | `https://globesim.de` nicht erreichbar, oder `server.url` in `capacitor.config.json` falsch |
| Icon oder Startbild ändert sich nicht | `npx cap sync` vergessen, danach neu bauen |

## Zahlen und Adressen für die Store-Einträge

Stand 14.10.2026, direkt aus dem Backend geholt:

- 284 aktive Reiseziele
- Datenschutzerklärung: https://globesim.de/legal/datenschutz
- Impressum: https://globesim.de/legal/impressum
- Hilfe: https://globesim.de/help
- Support: info@globesim.de · +49 157 51527729
- Firma: GlobeSIM, Karlstal 27a, 24143 Kiel, USt-IdNr. DE432657960
