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

## Timer-Benachrichtigungen

`src/native/timerNotifications.ts` (`@capacitor/local-notifications`, `@capacitor/app`). Geht die App in den
Hintergrund, bekommt jeder laufende Timer eine lokale Benachrichtigung zu seiner Endzeit (Android-Kanal `timers`,
Systemton); bei der Rückkehr werden alle storniert, im Vordergrund klingelt nur der In-App-Alarm. Ein Timer, der im
Hintergrund abläuft, steht danach auf „abgelaufen“, ohne Alarm und Toast. Tippen auf die Benachrichtigung öffnet das
Timer-Panel.

- Berechtigung: Der erste Timer-Start fragt danach. Abgelehnt läuft der Timer trotzdem, nur ohne Benachrichtigung.
- Android: Ohne „Wecker und Erinnerungen“ (ab Android 14 Standard) plant die App ungenau; die Benachrichtigung kann
  dann Minuten zu spät kommen. Wer vorher zurückkehrt, sieht den Timer still abgelaufen. Ein Hinweis dazu folgt mit N7.
  `SCHEDULE_EXACT_ALARM` steht im Manifest, `USE_EXACT_ALARM` bewusst nicht.
- iOS: Auch Kontrollzentrum oder ein Systemdialog zählen als Hintergrund. Läuft ein Timer dort ab, klingelt nur die
  Benachrichtigung. Während der Berechtigungsabfrage selbst ist noch nichts erlaubt: Ein Timer, der dabei abläuft,
  klingelt gar nicht (betrifft nur Timer von wenigen Sekunden).
- Tippt man im abgemeldeten Zustand auf eine Benachrichtigung, öffnet sich das Panel nach der nächsten Anmeldung.
  Beim Abmelden werden ausstehende und bereits angezeigte Timer-Benachrichtigungen entfernt.
- Wird die App im Hintergrund beendet, setzt der nächste Start einen abgelaufenen Timer wie bisher auf seine volle Dauer
  zurück.

## Bildschirm wach und externe Links

`src/native/keepAwake.ts` (`@capacitor-community/keep-awake`): Die Android-WebView und iOS vor 18.4 haben keine Screen
Wake Lock API. In der App läuft `useWakeLock` deshalb immer über das Plugin, im Web unverändert über die API. Der
Schalter „Bildschirm anlassen“ erscheint nativ immer, im Koch-Modus eingeschaltet, auf der Rezeptseite aus. Verlassen
der Seite oder Ausschalten gibt den Bildschirm frei. Schlägt das Plugin fehl, springt der Schalter auf aus.

`src/native/openExternal.ts` (`@capacitor/browser`): Der Quelle-Link eines Rezepts öffnet nativ im In-App-Browser
(Android: Custom Tabs, ohne passenden Browser der Standardbrowser; iOS: SFSafariViewController), damit die App-WebView
erhalten bleibt (E7). Im Web bleibt er ein normaler Link in einem neuen Tab.

## Prüfliste

Am Gerät nach einem Mock-Build (`npm run cap:sync`), jeweils auf Android und iOS:

- [ ] Die App startet ohne Fehler.
- [ ] Die Startseite zeigt die Mock-Daten.
- [ ] Navigation: Rezeptliste, Rezept, Koch-Modus, Kategorien, Profil und zurück.
- [ ] Safe Areas: oben (Statusleiste, Notch) und unten (Home-Indikator, Gestenleiste) ist nichts verdeckt.
- [ ] iOS: „Fotos hinzufügen“ im Editor (Bereich „Bilder“) öffnet die Auswahl mit Kamera und Fotomediathek.
- [ ] Android, Zurück-Taste (#325):
  - Ein offenes Sheet, ein Dialog, ein Menü oder die Fotoansicht schließt, die Seite bleibt.
  - Im Zutaten-Sheet mit offener Vorschlagsliste schließt erst die Liste, dann das Sheet.
  - Ohne Overlay geht es eine Seite zurück, nach einem direkten Einstieg (ohne Verlauf) zur Startseite.
  - Auf der Startseite und auf „Anmelden“ schließt die App. „Konto anlegen“ führt zurück zu „Anmelden“; nach einem
    direkten Einstieg (ohne Verlauf) schließt die App.
  - Ist die Tastatur offen, schließt Android zuerst die Tastatur. Das liegt beim System und gehört nicht zur App.
  - Tooltip: Schließt ein Sheet, geht der Fokus zurück auf seinen Auslöser. Hat der einen Tooltip (z. B. eine
    Zutatenzeile im Editor), öffnet der sich und nimmt das nächste `Escape`. Prüfen, ob dann ein zusätzlicher Druck
    nötig ist.
  - Zweimal schnell drücken, während ein Menü noch zuklappt: Der zweite Druck kann verloren gehen.
- [ ] Timer 1 Min. starten (beim ersten Start: Frage nach Benachrichtigungen erlauben), App in den Hintergrund: nach
      Ablauf kommt die Benachrichtigung „<Name> ist fertig“ mit Ton (iOS: Ton prüfen); Android: das Symbol in der
      Statusleiste ist das Foodly-Besteck, kein weißes Quadrat.
- [ ] Wie oben, aber den Bildschirm sofort nach dem Start sperren: Benachrichtigung mit Ton auf dem Sperrbildschirm.
- [ ] Timer im Vordergrund ablaufen lassen: nur der In-App-Alarm, keine zusätzliche Benachrichtigung, auch nicht nach
      kurzem Wechsel in den Hintergrund und zurück.
- [ ] Nach Ablauf im Hintergrund zurück in die App: Timer steht auf abgelaufen, kein verspäteter Alarm.
- [ ] Tippen auf die Benachrichtigung öffnet die App mit dem Timer-Panel.
- [ ] Android ohne „Wecker und Erinnerungen“: Der Wechsel in den Hintergrund öffnet keine Einstellungsseite, die
      Benachrichtigung kommt (eventuell verspätet).
- [ ] Benachrichtigungen abgelehnt: Der Timer läuft trotzdem und klingelt im Vordergrund.
- [ ] Koch-Modus: „Bildschirm anlassen“ ist sichtbar und an; der Bildschirm bleibt über die System-Sperrzeit hinaus an.
      Ausgeschaltet geht er normal aus.
- [ ] Rezeptseite: Der Schalter (Desktop-Zeile bzw. ⋯-Menü am Handy) funktioniert genauso; Verlassen der Seite gibt den
      Bildschirm frei.
- [ ] Quelle-Link eines Rezepts öffnet im In-App-Browser; Schließen („Fertig“ bzw. Android-Zurück) führt zurück zum
      Rezept.
