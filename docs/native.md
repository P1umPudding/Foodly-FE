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
npm run cap:assets      # Icon und Splash aus assets/ nach android/ und ios/ (siehe unten)
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
[ -n "$entry" ] && ! grep -qE '@capacitor|registerPlugin' "dist/$entry" && echo "Entry frei von Capacitor"
```

`SKAILE_PREVIEW_BASE` muss dafür ungesetzt sein, sonst liegt der Entry unter einem Unterpfad und `$entry` bleibt leer
(ohne die Prüfung `[ -n "$entry" ]` meldete der Check dann fälschlich Erfolg).

Der Name kommt aus `dist/index.html`, weil auch andere Chunks `index-*.js` heißen (Mocks, später Capacitor selbst).
Dazu darf native Arbeit den Entry nicht vergrößern: keine neue Größenwarnung (`chunkSizeWarningLimit` in
`vite.config.ts`).

## Timer-Benachrichtigungen

`src/native/timerNotifications.ts` (`@capacitor/local-notifications`, `@capacitor/app`). Geht die App in den
Hintergrund, bekommt jeder laufende Timer eine lokale Benachrichtigung zu seiner Endzeit (Android-Kanal `timers`,
Systemton); bei der Rückkehr werden alle storniert, im Vordergrund klingelt nur der In-App-Alarm. Ein Timer, der im
Hintergrund abläuft, steht danach auf „abgelaufen“, ohne Alarm und Toast. Tippen auf die Benachrichtigung öffnet das
Timer-Panel.

- Berechtigung: Der erste Timer-Start fragt danach. Abgelehnt läuft der Timer trotzdem, nur ohne Benachrichtigung;
  das Timer-Panel sagt das dann oben (ohne Link in die Einstellungen). Android zählt schon die erste Ablehnung, denn
  gefragt wird danach nicht mehr.
- Android: Ohne „Wecker und Erinnerungen“ (ab Android 14 Standard) plant die App ungenau; die Benachrichtigung kann
  dann Minuten zu spät kommen. Wer vorher zurückkehrt, sieht den Timer still abgelaufen. Das Timer-Panel weist darauf
  hin; sein Knopf „Genaue Wecker erlauben“ öffnet die Einstellung. Geprüft wird beim Öffnen des Panels und bei jeder
  Rückkehr in den Vordergrund.
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

## Anmeldung (Preferences)

`src/native/storage.ts` (`@capacitor/preferences`): iOS kann den `localStorage` der WebView leeren, dann wäre man
abgemeldet. Nativ liegt die Sitzung deshalb in Preferences (E5); `src/api/auth.ts` hält sie im Speicher, `bootstrap()`
lädt sie vor dem ersten Render, und jedes Schreiben geht durch (in einer Warteschlange, das letzte gewinnt). Im Web
bleibt alles bei `localStorage["foodly.auth"]`.

- Migration: Liegt beim Start nur in `localStorage` eine Sitzung, wird sie nach Preferences übernommen und danach aus
  `localStorage` gelöscht; liegt in beiden eine, gewinnt Preferences. Schlägt die Übernahme fehl, bleibt die alte Kopie
  bis zum nächsten Start (ein Abmelden löscht sie mit).
- Fehler: Ein fehlgeschlagenes Laden (oder keine Antwort nach 3 s) zählt als abgemeldet, nichts wird gelöscht. Ein
  fehlgeschlagenes Schreiben wird nur protokolliert, die App läuft mit dem Stand im Speicher weiter; nach einem Neustart
  gilt der zuletzt erfolgreich gespeicherte Stand (meist: abgemeldet, oder die Sitzung läuft beim ersten Refresh ab).
  Antwortet ein Schreiben gar nicht, wartet der Aufrufer höchstens 3 s; spätere Schreibvorgänge warten in der
  Warteschlange, bis es sich erledigt.
- Nach einem Token-Refresh wartet die Anfrage, die ihn ausgelöst hat, auf das Schreiben (höchstens 3 s). Wird die App
  beendet oder stürzt sie ab, bevor das Schreiben angekommen ist, ist man danach abgemeldet (der alte Refresh-Token ist
  beim Backend schon ungültig).
- Backup (Android, #342): Die Preferences-Datei `CapacitorStorage.xml` (die Sitzung) ist vom Google-Backup und von
  der Geräteübertragung ausgeschlossen, alles andere wird weiter gesichert (`allowBackup="true"`). Regeln:
  `res/xml/backup_rules.xml` (`fullBackupContent`, Android ≤ 11, gilt dort auch für die Übertragung) und
  `res/xml/data_extraction_rules.xml` (`dataExtractionRules`, Android 12+, `<cloud-backup>` und `<device-transfer>`);
  `cap sync` lässt beide und das Manifest in Ruhe, `src/native/androidBackup.test.ts` prüft sie. Nach einer
  Wiederherstellung oder auf einem neuen Gerät ist man abgemeldet. Bekannte Lücke: Ist bei einer Installation von vor #327 die
  Übernahme aus `localStorage` fehlgeschlagen, liegt die alte Kopie im (gesicherten) WebView-Speicher, und eine
  Wiederherstellung kann damit wieder anmelden (selten, bewusst hingenommen). Die Daten der Timer-Benachrichtigungen
  werden mitgesichert, das schadet nicht. iOS (Preferences in UserDefaults, im iCloud-Backup) ist noch offen
  (verschlüsselter Speicher ist kein Ziel).

## Icon, Splash, Statusleiste

- **Quellen:** `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`,
  `splash-dark.png`), abgeleitet aus `public/favicon.svg`. `npm run cap:assets` erzeugt daraus die Dateien unter
  `android/app/src/main/res/` und `ios/App/App/Assets.xcassets/`; sie sind committet. Das Skript läuft nur für
  Android und iOS, `public/` (PWA, Favicon) bleibt unverändert. `assets/adaptive-icon.mjs` läuft danach mit: Es
  rendert die Adaptive-Icon-Ebenen neu (das Werkzeug schreibt sie in 48 dp, unscharf; der Hintergrund bekommt die
  vollen 108 dp ohne Inset) und ersetzt das querformatige `drawable-night/splash.png` durch das hochformatige. Die
  Legacy-Icons `mipmap-*/ic_launcher*.png` (nur Android 7) lässt es, wie das Werkzeug sie erzeugt. Danach `git status` prüfen: Das Werkzeug formatiert
  `AndroidManifest.xml` und `AppIcon.appiconset/Contents.json` um, ohne Inhalt zu ändern; das nicht übernehmen.
- **Splash:** `launchAutoHide: false` (`capacitor.config.ts`). `src/native/appShell.ts` blendet ihn nach dem ersten
  Render aus (`ThemeProvider`); scheitert das Rendern, nach spätestens 3 s. Scheitert das Ausblenden selbst, versucht
  es der 3-s-Fallback noch einmal.
- **Android:** Der System-Splash zeigt das App-Icon auf `#fafafa` bzw. `#0f0f0f` (`windowSplashScreenBackground`,
  `values(-night)/colors.xml`); `splash.png` ist der Fensterhintergrund dahinter. Am Gerät auf Android < 12 und ≥ 12
  prüfen. Ist das Icon auf dem hellen Splash nicht zu sehen, ist `windowSplashScreenIconBackgroundColor` `#7300ff`
  der Ausweg. **iOS:** `splash.png` bzw. `splash-dark.png` im Launch-Screen.
- **Statusleiste:** Die Symbole folgen dem aufgelösten Theme (dunkel → helle Symbole), auch bei „System“ und einem
  Wechsel im OS. Keine Hintergrundfarbe, das Layout bleibt Edge-to-Edge.

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
      Benachrichtigung kommt (eventuell verspätet). Das Timer-Panel zeigt „Timer können sich im Hintergrund um einige
      Minuten verspäten.“ mit dem Knopf „Genaue Wecker erlauben“; er öffnet die Einstellung. Dort erlauben und
      zurückkehren: Der Hinweis ist weg.
- [ ] Benachrichtigungen abgelehnt: Der Timer läuft trotzdem und klingelt im Vordergrund. Das Timer-Panel zeigt
      „Benachrichtigungen sind aus …“, ohne Knopf. In den Systemeinstellungen erlauben, zurückkehren: Der Hinweis ist
      weg.
- [ ] Ersten Timer im offenen Panel starten, die Frage nach Benachrichtigungen ablehnen: Spätestens beim nächsten
      Öffnen des Panels steht „Benachrichtigungen sind aus …“ da. (Geprüft wird beim Öffnen und bei der Rückkehr in den
      Vordergrund; ob der Systemdialog Letzteres auslöst, hängt vom System ab. Notieren, ob er sofort erscheint.)
- [ ] iOS mit erlaubten Benachrichtigungen und Android mit beiden Erlaubnissen: Das Timer-Panel zeigt keinen Hinweis.
- [ ] Koch-Modus: „Bildschirm anlassen“ ist sichtbar und an; der Bildschirm bleibt über die System-Sperrzeit hinaus an.
      Ausgeschaltet geht er normal aus.
- [ ] Rezeptseite: Der Schalter (Desktop-Zeile bzw. ⋯-Menü am Handy) funktioniert genauso; Verlassen der Seite gibt den
      Bildschirm frei.
- [ ] Quelle-Link eines Rezepts öffnet im In-App-Browser; Schließen („Fertig“ bzw. Android-Zurück) führt zurück zum
      Rezept.
- [ ] Icon auf dem Home-Bildschirm: Android rund und adaptiv (Besteck weiß auf Lila, scharf, nichts abgeschnitten),
      iOS.
- [ ] Splash hell und dunkel: Systemmodus umstellen, App neu starten. Der Splash verschwindet beim ersten Render;
      ein kurzes Skelett einer noch ladenden Seite danach ist in Ordnung.
- [ ] Android ≥ 12: Das Icon ist auf dem hellen System-Splash sichtbar.
- [ ] Statusleiste lesbar in hellem und dunklem Theme; ein Theme-Wechsel im Profil ändert die Symbolfarbe sofort.
- [ ] Theme „System“: Wechsel des OS-Modus bei offener App ändert die Symbolfarbe mit.
- [ ] Theme fest auf Hell, OS bei offener App auf Dunkel stellen (und umgekehrt): Die Symbole bleiben lesbar.

REST-Build (`.env.native.local`, siehe „Mock- und REST-Build“), jeweils auf Android und iOS:

- [ ] Anmelden, App beenden (aus dem App-Umschalter wischen), neu starten: weiterhin angemeldet, ohne kurzes
      „abgemeldet“.
- [ ] Abmelden, App beenden, neu starten: abgemeldet, die Anmeldeseite erscheint.
- [ ] Android, Backup (#342), auf einem Emulator mit API ≤ 30 und einem mit API ≥ 31, alle Befehle im
      Repo-Wurzelordner:
  - REST-Build synchronisieren (`npm run cap:sync`), Debug-APK bauen (für `run-as`):
    `(cd android && ./gradlew assembleDebug)`, installieren:
    `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
  - App starten, anmelden, im Profil das Theme auf Dunkel stellen, mit Home in den Hintergrund schicken und etwa
    10 s warten (die WebView schreibt verzögert). Nicht `am force-stop`: Eine gestoppte App überspringt das Backup.
  - `adb shell run-as io.github.p1umpudding.foodly ls shared_prefs`: `CapacitorStorage.xml` ist da.
  - `adb shell bmgr enable true`, `adb shell bmgr list transports`, dann
    `adb shell bmgr transport com.android.localtransport/.LocalTransport` (der Stern in `list transports` muss
    danach dort stehen), `adb shell bmgr backupnow io.github.p1umpudding.foodly` (meldet „Success“).
  - `adb uninstall io.github.p1umpudding.foodly`, `adb install android/app/build/outputs/apk/debug/app-debug.apk`
    (stellt automatisch wieder her; sonst `adb shell bmgr restore <token> io.github.p1umpudding.foodly`, Token aus
    `adb shell bmgr list sets`).
  - Erwartet: Theme Dunkel (die Wiederherstellung lief), Anmeldeseite (abgemeldet), `run-as … ls shared_prefs` zeigt
    kein `CapacitorStorage.xml`.
  - API ≥ 31, Geräteübertragung (auf API ≤ 30 deckt `backup_rules.xml` sie mit ab, kein eigener Test): vor
    `backupnow` `adb shell settings put secure backup_local_transport_parameters "is_encrypted=true,is_device_transfer=true"`,
    sonst gleich; danach `adb shell settings delete secure backup_local_transport_parameters`.

## Web-App installieren (PWA)

Unabhängig von der Capacitor-App lässt sich die Web-App aus dem Browser installieren (#345): Chrome (Android und
Desktop) und Samsung Internet bieten „App installieren“ an, die installierte App startet ohne Browserleiste mit eigenem
Icon. Grundlage sind `public/manifest.webmanifest` (Icons aus `public/icons/`, URLs relativ, folgen also `base`) und ein
minimaler Service Worker `public/sw.js`.

- **Registrierung** (`src/serviceWorker.ts`, aufgerufen in `src/main.tsx`) nur im Web-Produktionsbuild: nicht in
  `vite dev`, nicht in Tests, nicht bei `--mode native` (dort entfernt der Build den Code) und nicht in der
  Capacitor-Hülle (`isNative()`). `sw.js` landet zwar auch im nativen `dist/`, wird dort aber nie registriert.
- **Kein Offline-Modus, kein Cache:** `sw.js` hat einen `fetch`-Listener ohne `respondWith`, jede Anfrage (App, `/api`,
  Bilder) geht unverändert ans Netz. Chrome ab 108 (Android) bzw. 112 (Desktop) braucht dafür gar keinen Service Worker
  mehr; der Listener ist für ältere Chromium-Versionen, Samsung Internet und Brave da. Chrome kann in der Konsole vor
  einem „no-op fetch handler“ warnen, das ist gewollt. Offline-Daten bleiben Phase 8 (`docs/plan.md`).
- **Updates:** Kein Precache, `skipWaiting` und `clients.claim`: Ein neues Deployment wirkt beim nächsten Laden, wie
  ohne Service Worker. Wie lange der Server `index.html` cachen lässt, ist eine Hosting-Frage.
- **Unterpfad:** Die Worker-URL ist `${BASE_URL}sw.js`, der Scope (Standard: Ordner des Workers) also `base`, z. B.
  unter `SKAILE_PREVIEW_BASE`.
- **iOS/Safari:** unverändert, Installation über Teilen → „Zum Home-Bildschirm“.
- **Brave, Firefox:** ohne Gewähr, das Verhalten liegt beim Browser. Echte installierte Apps (WebAPK, eigenes Icon im
  App-Drawer) legen auf Android nur Chrome und Samsung Internet an; andere Browser bieten oft nur eine Verknüpfung an.
- **Entfernen:** `sw.js` nicht einfach löschen. Die SPA-Weiterleitung (`public/_redirects`) liefert dann `index.html`
  aus, das Update schlägt fehl und installierte Worker bleiben. Stattdessen eine `sw.js` ausliefern, die sich selbst
  abmeldet (`self.registration.unregister()`).

Prüfen: `npm run build && npm run preview`, in Chrome öffnen, DevTools → Application: unter „Service workers“ genau ein
aktiver `sw.js`, unter „Manifest“ keine Installierbarkeitsfehler, „Cache storage“ leer. Nach einem neuen Build lädt ein
Reload das neue `index-*.js`.
