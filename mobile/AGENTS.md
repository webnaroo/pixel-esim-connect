# App-Paket (iPhone und Android)

Dieser Ordner ist eine eigene Capacitor-App-Hülle um die Live-Seite `https://globesim.de`.

- Nie Teil des Web-Builds: der Web-Build (Vite/TanStack) darf diesen Ordner nicht einbinden,
  und dieser Ordner darf keinen Code aus `src/` importieren. Die Shop-Logik bleibt im Web.
- Native Zusätze (alles andere bleibt Webseite): Fingerabdruck-Sperre und verschlüsselte Offline-eSIMs
  (`GlobeSimAppPlugin.java`, Aufruf über `window.Capacitor` in `src/lib/native-app.ts`) und Push (Capacitor-Plugin +
  Firebase). Offline-Seite `www/index.html` rendert gespeicherte Daten nur über textContent und als Bild.
  Aktivierungsdaten dürfen nie in Push-Texte, Logs oder unverschlüsselte Speicher.
- Die App zeigt die Webseite unverändert. Neue Shop-Funktionen entstehen deshalb immer zuerst
  in `src/` und erscheinen dann automatisch in der App – hier wird nichts nachgebaut.
- `capacitor.config.json` hält die Ziel-URL und die App-Kennung `de.globesim.app`.
  Nach jeder Änderung hier oder an `assets/`: `npx cap sync`.
- `android/` und `ios/` sind echte, generierte Projektordner. Sie werden mit
  `npx @capacitor/assets generate --android --ios` aus `assets/icon-source.png`, `icon-foreground.png`,
  `icon-background.png`, `splash-source.png` und `splash-dark.png` erzeugt – nicht von Hand nachmalen.
  Das Icon ist das Website-Logo (`public/globesim-logo.png`) auf Weiß, das Startbild auf Creme (#F6F3EE).
- Die echten Store-Dateien baut und signiert der Inhaber selbst: iPhone nur auf einem Mac mit
  Xcode, Android mit Android Studio und eigenem Keystore. Diese Umgebung gibt es hier nicht,
  und die Store-Konten gehören dem Inhaber.
- Vor jedem Einreichen klären (steht in `README.md`): Abrechnung für digitale Waren
  (Apple 15–30 %) und Enough-eigener-Nutzen für Apples Richtlinie 4.2, am einfachsten
  Push-Mitteilungen.
