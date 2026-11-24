# Native App (Android und iOS)

Foodly läuft in einer Capacitor-Hülle als App. Entscheidung und Grenzen: [ADR 0005](decisions/0005-native-shell.md),
Code: `src/native/` ([`architecture.md`](architecture.md) §6a).

## Voraussetzungen

- Node ≥ 22 (Capacitor 8; `.nvmrc` nennt 24).
- Android: Android Studio mit SDK.
- iOS: ein Mac mit Xcode. Die iOS-Projekte nutzen Swift Package Manager, CocoaPods ist nicht nötig.

Im Linux-Container laufen `npm run build:native` und `npm run cap:sync`; öffnen und starten geht nur mit Android Studio
bzw. Xcode.

## Mock- und REST-Build

`npm run build:native` (`tsc && vite build --mode native`) baut nach `dist/`, immer mit `base` `/`, auch wenn
`SKAILE_PREVIEW_BASE` gesetzt ist. Vite liest im Modus `native` zusätzlich `.env.native` und `.env.native.local`.

- **Mock-Build (Standard):** `.env.native` (committet) setzt `VITE_MOCK=1`. Es gibt noch kein erreichbares Backend.
- **REST-Build:** `.env.native.local` anlegen (nicht committet, `.gitignore` deckt `*.local` ab):

  ```
  VITE_MOCK=
  VITE_API_URL=https://foodly.example/api/v1
  ```

  `VITE_API_URL` gehört in diese Datei selbst: Ein Wert aus `.env.local` gilt sonst auch hier, und
  `http://localhost:…` zeigt auf dem Gerät auf das Gerät selbst (der Build warnt bei `localhost`; nur der
  iOS-Simulator erreicht so den Mac).

Der Build bricht ab, wenn weder `VITE_MOCK=1` noch eine absolute `VITE_API_URL` (`https://…` oder `http://…`) gesetzt
ist. Variablen aus der Shell haben Vorrang vor den Dateien (`VITE_MOCK= npm run build:native` ist ein REST-Build).

## Synchronisieren, öffnen, starten

```bash
npm run cap:sync        # build:native + cap sync: kopiert dist/ nach android/ und ios/, aktualisiert Plugins
npx cap open android    # Android Studio, dann Gerät/Emulator wählen und starten
npx cap open ios        # Xcode (Mac), Team für die Signierung wählen, Gerät wählen und starten
```

`android/` und `ios/` sind committet; die kopierte Web-App (`android/app/src/main/assets/public/`,
`ios/App/App/public/`) und Build-Artefakte ignorieren die `.gitignore`-Dateien darin. Nach dem Sync zeigt
`git status` dort keine Änderungen, solange Capacitor-Version und Plugins gleich bleiben.

## Lokaler Test gegen ein Backend im LAN

Für ein Backend unter `http://<LAN-IP>:8080` (ohne HTTPS) lokal, **nicht committet**:

- `capacitor.config.ts`: `server.androidScheme: 'http'`, sonst blockiert Android die Aufrufe als Mixed Content.
- `.env.native.local`: `VITE_MOCK=` und `VITE_API_URL=http://<LAN-IP>:8080/api/v1`. Der Build warnt bei `http://`.

Danach `npm run cap:sync`, vor einem Commit beides zurücksetzen. Der Weg ist für Android gedacht und noch nicht am Gerät
geprüft. iOS blockiert `http://` über die App Transport Security; ob eine lokale Ausnahme in `Info.plist` (etwa
`NSAllowsLocalNetworking`) für eine LAN-IP reicht, ist nicht verifiziert.

## CORS

Die App ruft das Backend von einem eigenen Origin aus auf. Für einen REST-Build muss das Backend beide in
`CORS_ALLOWED_ORIGINS` aufnehmen ([B20](backend-questions.md)):

- iOS: `capacitor://localhost`
- Android: `https://localhost` (mit `androidScheme: 'https'`; beim LAN-Test `http://localhost`)

## Entry-Check

Der Web-Entry-Chunk enthält keinen Capacitor-Code. Nach `npm run build` (Web, nicht `build:native`):

```bash
entry=$(grep -oE 'src="/assets/index-[^"]+\.js"' dist/index.html | sed 's/^src="\///; s/"$//')
! grep -qE '@capacitor|registerPlugin' "dist/$entry" && echo "Entry frei von Capacitor"
```

Der Name kommt aus `dist/index.html`, weil auch andere Chunks `index-*.js` heißen (Mocks, später Capacitor selbst).
Dazu darf native Arbeit den Entry nicht vergrößern: keine neue Größenwarnung (`chunkSizeWarningLimit` in
`vite.config.ts`).

## Prüfliste

Am Gerät nach einem Mock-Build (`npm run cap:sync`), jeweils auf Android und iOS:

- [ ] Die App startet ohne Fehler.
- [ ] Die Startseite zeigt die Mock-Daten.
- [ ] Navigation: Rezeptliste, Rezept, Koch-Modus, Kategorien, Profil und zurück.
- [ ] Safe Areas: oben (Statusleiste, Notch) und unten (Home-Indikator, Gestenleiste) ist nichts verdeckt.
- [ ] iOS: „Fotos hinzufügen“ im Editor (Bereich „Bilder“) öffnet die Auswahl mit Kamera und Fotomediathek.
