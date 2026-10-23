# Android: App-Datei für Google Play bauen (ohne Android Studio)

GitHub baut die signierte `.aab` für dich. Du brauchst nur einen eigenen Schlüssel.

## 1. Schlüssel einmalig erzeugen (auf deinem Windows-Rechner)
Java muss installiert sein (`keytool` gehört dazu). In PowerShell:

```powershell
keytool -genkeypair -v -keystore globesim-release.jks -alias globesim -keyalg RSA -keysize 2048 -validity 10000
```

Passwörter wählen und **notieren**. Datei und Passwörter sicher aufbewahren (nicht ins Repo, nicht in einen Chat):
ohne sie lässt sich die App nie aktualisieren. Eine Kopie auf einem zweiten Datenträger anlegen.

## 2. Secrets in GitHub eintragen
Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Inhalt |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Ergebnis von `[Convert]::ToBase64String([IO.File]::ReadAllBytes("globesim-release.jks"))` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | `globesim` |
| `ANDROID_KEY_PASSWORD` | Passwort des Schlüssels |

## 2b. Push-Mitteilungen einrichten (Firebase, einmalig, kostenlos)
Ohne diesen Schritt läuft die App normal, nur ohne Mitteilungen (der Schalter erscheint dann nicht).

1. https://console.firebase.google.com → **Projekt hinzufügen** (Name z. B. „GlobeSIM“, Analytics kann aus bleiben).
2. Im Projekt: **Android-App hinzufügen**, Paketname **`de.globesim.app`** → `google-services.json` herunterladen.
   Als Secret **`ANDROID_GOOGLE_SERVICES_JSON_BASE64`** eintragen:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))`
3. Firebase → Projekteinstellungen → **Dienstkonten** → **Neuen privaten Schlüssel generieren**. Die JSON-Datei
   als **Runtime-Secret `FCM_SERVICE_ACCOUNT_JSON`** im Cloudflare-Worker eintragen (ganzer Dateiinhalt). Nicht ins Repo.
4. Datenbank: `drizzle/migrations/0030_push_devices.sql` und `0031_esim_expiry_alert.sql` im Supabase SQL Editor ausführen.
5. Ablauf-Mitteilung: den Abschnitt 5 aus `docs/self-hosting-cron.sql` im SQL Editor ausführen (stündlicher Job).

## 3. Bauen
GitHub → Actions → **Android App Bundle** → Run workflow. `versionCode` bei jedem Upload um 1 erhöhen.
Danach unter dem Lauf bei **Artifacts** `globesim-release-aab` herunterladen und in der Play Console hochladen.

## Was die App kann (Einstellungen → App)
- **Mitteilungen:** „eSIM bereit“, „80 % / 100 % Datenvolumen“ und „eSIM läuft bald ab“ (48 Stunden vor Tarifende, nur für angemeldete Kunden).
- **Installation per Knopfdruck:** „Auf Android installieren“ öffnet direkt den Installationsdialog von Android (auch in der Offline-Ansicht).
- **Fingerabdruck-Sperre:** App öffnet sich nur mit Fingerabdruck, Gesicht oder Geräte-PIN (Sperre nach 30 s im Hintergrund).
- **eSIMs offline:** QR-Code und Installationsdaten verschlüsselt auf dem Gerät. Beim Abmelden werden sie gelöscht.
  Das Installieren einer eSIM selbst braucht kurz WLAN oder mobile Daten.
- Tippen auf eine Mitteilung öffnet das Konto, wenn die App schon läuft. Bei komplett beendeter App öffnet sich die Startseite.

## Vor dem Einreichen prüfen
- Google verlangt für neue Uploads ein aktuelles `targetSdkVersion`. Aktuell steht 34 in
  `android/variables.gradle`. Wenn die Play Console den Upload ablehnt, muss Capacitor
  (und damit Android Gradle Plugin und SDK) angehoben werden.
- Datenschutz-URL: https://globesim.de/legal/datenschutz
