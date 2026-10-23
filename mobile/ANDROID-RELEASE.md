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

## 3. Bauen
GitHub → Actions → **Android App Bundle** → Run workflow. `versionCode` bei jedem Upload um 1 erhöhen.
Danach unter dem Lauf bei **Artifacts** `globesim-release-aab` herunterladen und in der Play Console hochladen.

## Vor dem Einreichen prüfen
- Google verlangt für neue Uploads ein aktuelles `targetSdkVersion`. Aktuell steht 34 in
  `android/variables.gradle`. Wenn die Play Console den Upload ablehnt, muss Capacitor
  (und damit Android Gradle Plugin und SDK) angehoben werden.
- Datenschutz-URL: https://globesim.de/legal/datenschutz
