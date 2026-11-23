# Phase 7 — Native App mit Capacitor — Issue-Plan

> Entwurf 2026-11-23 (Lead), wartet auf Freigabe durch Kolja oder Daniel. Die Abschnitte N1–N7 sind die Issue-Texte;
> der Titel ist jeweils die Überschrift ohne „Nx —“. Die Issues setzen die Empfehlungen zu E1–E9 der Spec voraus; ändert
> die Freigabe eine Entscheidung, passe ich die betroffenen Issues vor dem Anlegen an. E1 (App-ID) hat keine Empfehlung:
> N1 wird erst angelegt, wenn die ID feststeht; sie ersetzt dann `<APP_ID>` und `<APP_NAME>` wörtlich.

Spec: `docs/superpowers/specs/2026-11-23-phase-7-native-app-design.md`. Architektur: `docs/architecture.md`, neue
Decision-Note 0005 (kommt mit N1).

Labels: `agent-ready`, `phase:7`, `device-check`, dazu `ui`, wo passend. Das Backend blockiert keines der Issues.
Lokale Checks (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`,
`npm run lint`; ab N1 zusätzlich `npm run cap:sync` ohne Fehler. Worker haben kein Android-SDK und kein Xcode: Native
Verhalten wird mit Vitest gegen gemockte Plugins getestet, am Gerät prüfen Kolja/Daniel nach der Checkliste in
`docs/native.md`. Jedes Issue ergänzt dort seine Prüfzeilen.

Weil fast jedes Issue `package.json`/`package-lock.json` und `ios/`/`android/` berührt: nach N1 höchstens zwei Issues
gleichzeitig, der zweite rebased vor dem PR.

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| N1 | Native App: Capacitor-Grundgerüst für Android und iOS | – | – |
| N2 | Native App: Icon, Splash und Statusleiste | N1 | N3 |
| N3 | Native App: Android-Zurück-Taste | N1 | N2 |
| N4 | Native App: Bildschirm wach und externe Links | N1 | N5 |
| N5 | Native App: Anmeldung in Preferences speichern | N1 | N4 |
| N6 | Native App: Timer klingeln im Hintergrund | N1 | N2, N3 |
| N7 | Native App: Hinweise zu Benachrichtigungen im Timer-Panel | N6 | – |

---

## N1 — Native App: Capacitor-Grundgerüst für Android und iOS

Labels: agent-ready, phase:7, device-check · Depends on: –

### Context
Phase 7 verpackt die SPA mit Capacitor 8 als App (Spec §Architektur, „Build und Projekte“). Am 2026-11-23 im
Linux-Container geprüft: `cap add android`, `cap add ios` (SPM, ohne CocoaPods/Xcode) und `cap sync` laufen mit
`@capacitor/*` 8.6.2. Es gibt kein erreichbares Backend, daher ist der native Build standardmäßig ein Mock-Build (E6).

### Goal
`npm run cap:sync` baut die Web-App für native und erzeugt synchronisierte `android/`- und `ios/`-Projekte, die Kolja oder
Daniel in Android Studio bzw. Xcode öffnen und auf einem Gerät starten können.

### Behaviour
- `capacitor.config.ts`: `appId: '<APP_ID>'`, `appName: '<APP_NAME>'`, `webDir: 'dist'`, `server.androidScheme: 'https'`.
- iOS `Info.plist`: `NSCameraUsageDescription` („Foodly nutzt die Kamera, damit du Fotos zu Rezepten aufnehmen kannst.“) und
  `NSPhotoLibraryUsageDescription` („Foodly greift auf deine Fotos zu, damit du Bilder zu Rezepten hinzufügen kannst.“),
  nötig für `<input type=file>`.
- Pakete exakt gepinnt: `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/android`, `@capacitor/ios`, alle 8.6.2.
- `android/` und `ios/` committet; deren Build-Artefakte sind ignoriert (die von Capacitor erzeugten `.gitignore` reichen,
  sonst ergänzen).
- `npm run build:native`: `tsc && vite build --mode native`. Im Modus `native` ist `base` immer `/` (auch mit
  `SKAILE_PREVIEW_BASE`). Der Build bricht mit einer klaren Meldung ab, wenn weder `VITE_MOCK=1` noch ein absoluter
  `VITE_API_URL` (`https://…`) gesetzt ist.
- `.env.native` (committet): `VITE_MOCK=1`. Für einen REST-Build legt man `.env.native.local` mit `VITE_MOCK=` und
  `VITE_API_URL=https://…/api/v1` an (`.gitignore` deckt `*.local` ab; prüfen).
- `npm run cap:sync`: `npm run build:native && cap sync`.
- `src/native/platform.ts`: `isNative()` und `platform()` (`'web' | 'android' | 'ios'`) über
  `globalThis.Capacitor?.isNativePlatform?.()` / `getPlatform?.()` (die native Hülle injiziert das Objekt), **ohne**
  statischen Import von `@capacitor/core`; so bleibt Capacitor aus dem Web-Entry. Plugins importieren die Adapter
  dynamisch.
- ESLint: `no-restricted-imports` verbietet `@capacitor/*` und `@capacitor-community/*` außerhalb `src/native/`.
- `docs/native.md`: Voraussetzungen (Node ≥ 22, Android Studio, Xcode auf dem Mac), Mock- vs. REST-Build, `cap:sync`,
  Öffnen/Starten (`npx cap open android|ios`), lokaler LAN-Test mit `androidScheme: 'http'` als nicht committete
  Abweichung, CORS-Origins für das Backend (`capacitor://localhost`, `https://localhost`), Abschnitt „Prüfliste“ mit den
  ersten Zeilen (App startet, Startseite mit Mock-Daten, Navigation, Safe Areas oben/unten auf Android und iOS, Bild
  hinzufügen öffnet Kamera/Galerie auf iOS).
- `docs/backend-questions.md`: B20 „Native Origins in `CORS_ALLOWED_ORIGINS`“ (Hinweis, kein Blocker, Spec).
- `docs/decisions/0005-native-shell.md`: Capacitor, `src/native/` als einzige Stelle für native APIs, Plugins dynamisch
  importiert, Web bleibt Primärziel.
- `CLAUDE.md`: Befehle `build:native`/`cap:sync`, Modul `src/native/`, Env-Tabelle um `.env.native` ergänzt.
- `docs/architecture.md`: kurzer Abschnitt „Native (`src/native/`)“ mit Verweis auf ADR 0005.

### Acceptance criteria
1. `npm run cap:sync` läuft im Container ohne Fehler; danach enthalten `android/app/src/main/assets/public/` und
   `ios/App/App/public/` die gebaute `index.html`.
2. Der native Build hat `base` `/`: In `dist/index.html` beginnen Script- und Manifest-Pfade mit `/`, auch wenn
   `SKAILE_PREVIEW_BASE=/x/` gesetzt ist.
3. `npm run build:native` mit `VITE_MOCK=` und ohne absoluten `VITE_API_URL` bricht mit einer Meldung ab, die auf
   `.env.native.local` verweist.
4. Nach `npm run build` (Web) enthält der Entry-Chunk keinen Capacitor-Code:
   `! grep -qE '@capacitor|registerPlugin' dist/assets/index-*.js`; die Größenwarnung (`chunkSizeWarningLimit` 710) bleibt
   aus. Diese Prüfung gilt für alle folgenden Issues („Entry-Check“).
5. Vitest: `isNative()`/`platform()` liefern im Test `false`/`'web'` und mit gesetztem `globalThis.Capacitor`
   (`isNativePlatform: () => true`, `getPlatform: () => 'android'`) `true`/`'android'`.
5a. `ios/App/App/Info.plist` enthält beide Usage-Descriptions mit den Texten oben.
6. `npm run lint` meldet einen Import von `@capacitor/core` in einer Datei unter `src/components/` als Fehler (im PR
   kurz nachgewiesen, nicht committet).
7. `docs/native.md`, ADR 0005, CLAUDE.md und architecture.md sind wie beschrieben ergänzt.
8. Die fünf lokalen Checks laufen durch.

### Non-goals
Plugins (kommen mit N2–N6), Icons/Splash (N2), Store, CI-Builds, Signieren.

### Assumptions
E1 (App-ID/Name) und E2 (beide Plattformen) laut Freigabe; E6 = Mock-Build als Standard.

### Affected areas
`package.json`, `package-lock.json`, `capacitor.config.ts`, `vite.config.ts`, `.env.native`, `.gitignore`,
`eslint.config.js`, `src/native/platform.ts` (+ Test), `android/`, `ios/` (inkl. `Info.plist`), `docs/native.md`,
`docs/decisions/0005-native-shell.md`, `docs/architecture.md`, `docs/backend-questions.md`, `CLAUDE.md`.

---

## N2 — Native App: Icon, Splash und Statusleiste

Labels: agent-ready, phase:7, device-check, ui · Depends on: N1

### Context
Spec N1 („Hülle“). Heute gibt es nur Web-Icons bis 512 px (`public/icons/`) und `public/favicon.svg`. `@capacitor/assets`
braucht ein 1024-px-Icon und einen 2732-px-Splash. Bei Android 15+ (edge-to-edge) greift eine Statusleisten-Farbe nicht;
das Layout tragen die Safe-Area-Abstände aus Phase 6.

### Goal
Die App hat ein Foodly-Icon und einen ruhigen Splash, und die Statusleisten-Symbole sind im hellen und dunklen Theme
lesbar.

### Behaviour
- Quelldateien `assets/icon-only.png` (1024×1024, aus `favicon.svg`; gerastert einmalig mit dem in `@capacitor/assets`
  enthaltenen `sharp`, das Skript dafür wird nicht committet), `assets/icon-foreground.png` + `assets/icon-background.png`
  für Android-Adaptive-Icons, `assets/splash.png` und `assets/splash-dark.png` (2732×2732, Logo mittig auf
  `#fafafa` bzw. `#0f0f0f`, den Theme-Farben aus `index.html`). `@capacitor/assets` (dev, gepinnt) erzeugt daraus die
  Plattform-Dateien; die erzeugten Dateien werden committet. Skript `npm run cap:assets`.
- `@capacitor/splash-screen` (gepinnt): `launchAutoHide: false`; `src/native/appShell.ts` startet in `src/main.tsx`
  **vor** `bootstrap()` einen 3-s-Fallback und blendet den Splash nach dem ersten Render aus (was zuerst kommt).
- `@capacitor/status-bar` (gepinnt): `src/native/appShell.ts` setzt `Style.Light`/`Style.Dark` passend zum aufgelösten
  Theme und folgt Theme-Wechseln (`ThemeProvider`). Keine Hintergrundfarbe setzen.
- Auf Web sind alle Aufrufe No-ops; die Plugins werden nur nativ dynamisch importiert.
- `docs/native.md`, Prüfliste: Icon auf dem Home-Bildschirm, Splash hell/dunkel, Statusleiste lesbar in beiden Themes,
  Wechsel des Themes in der App.

### Acceptance criteria
1. `npm run cap:assets` erzeugt die Icons und Splash-Dateien für Android und iOS ohne Fehler; sie sind committet.
2. Vitest: auf Web ruft `appShell` keine Plugin-Funktion auf; nativ (gemockt) ruft der Start `SplashScreen.hide` einmal
   auf, auch wenn das Rendern scheitert (Fallback nach 3 s, mit Fake-Timern geprüft).
3. Vitest: Theme `dark` → `StatusBar.setStyle({ style: Style.Dark })`, Wechsel auf `light` → `Style.Light`.
4. Entry-Check aus N1 AK 4.
5. Prüfzeilen in `docs/native.md` ergänzt; die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
Ein neues Logo, Store-Grafiken, Statusleisten-Hintergrundfarbe.

### Assumptions
Das Logo ist `public/favicon.svg`.

### Affected areas
`assets/`, `android/app/src/main/res/`, `ios/App/App/Assets.xcassets/`, `package.json`, `capacitor.config.ts`,
`src/native/appShell.ts` (+ Test), `src/main.tsx`, `src/theme/ThemeProvider.tsx`, `docs/native.md`.

---

## N3 — Native App: Android-Zurück-Taste

Labels: agent-ready, phase:7, device-check · Depends on: N1

### Context
Spec „Zurück-Taste (N2)“. Ohne Handler schließt die Android-Zurück-Taste in Capacitor die App bzw. geht nur im WebView-
Verlauf zurück und ignoriert offene Sheets. Die Overlays kommen aus `@postxl/ui-components` (Radix) und schließen auf
`Escape`.

### Goal
Die Zurück-Taste verhält sich wie in nativen Apps: erst Overlay schließen, dann zurück, auf der Startseite App schließen.

### Behaviour
`src/native/backButton.ts`, registriert einmal beim Start (nur Android, `@capacitor/app` gepinnt, dynamisch importiert):
1. Ist ein Overlay offen (`[role="dialog"][data-state="open"]`, `[role="alertdialog"][data-state="open"]`,
   `[role="menu"][data-state="open"]`, `[role="listbox"][data-state="open"]` (postxl `Select`); das zuletzt im DOM stehende ist das oberste), wird ein `keydown` `Escape`
   (bubbles) an dieses Element geschickt. Nichts sonst.
2. Sonst, wenn der Pfad ohne `basename` nicht `/` ist: zurück im Verlauf, wenn `canGoBack`; sonst `navigate('/')`.
3. Auf `/`: `App.exitApp()`.
Die Navigation läuft über React Router (Hook oder Komponente in `src/native/`, eingebunden in `App.tsx`), nicht über
`window.location`.

### Acceptance criteria
1. Vitest mit gemocktem `App`-Plugin: offenes postxl-`Dialog` → nach Zurück ist es geschlossen, der Pfad unverändert.
2. Dasselbe für ein `BottomSheet`, ein `DropdownMenu` und ein offenes `Select`; bei zwei offenen Overlays schließt nur das oberste.
3. Ohne Overlay auf `/recipes/1` mit Verlauf → zurück zur vorigen Route; ohne Verlauf → `/`.
4. Auf `/` → `exitApp` wird aufgerufen.
5. Auf Web und iOS wird kein Listener registriert.
6. Prüfzeilen in `docs/native.md`; die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
iOS-Wischgeste (WKWebView-Standard bleibt), Verhalten in Formularen mit ungespeicherten Änderungen (Autosave existiert).

### Assumptions
Alle Overlays der App sind postxl/Radix und schließen auf Escape (heute der Fall).

### Affected areas
`package.json`, `src/native/backButton.ts` (+ Test), `src/App.tsx`, `docs/native.md`.

---

## N4 — Native App: Bildschirm wach und externe Links

Labels: agent-ready, phase:7, device-check · Depends on: N1

### Context
Spec N3 und N6. `src/hooks/useWakeLock.ts` nutzt die Screen Wake Lock API, die die Android-WebView und iOS < 18.4 nicht
haben. Der Quelle-Link in `src/pages/RecipeDetail.tsx` (`target="_blank"`) würde nativ die App-WebView verlassen.

### Goal
Im Koch-Modus bleibt der Bildschirm auch in der App wach; externe Links öffnen im In-App-Browser (E7).

### Behaviour
- `src/native/keepAwake.ts` (`@capacitor-community/keep-awake` 8.0.1, gepinnt): `keepAwake()`/`allowSleep()`.
  `useWakeLock` nutzt nativ diesen Adapter (`supported` ist nativ immer `true`), auf Web unverändert die Wake Lock API.
  Ein Fehler des Plugins setzt `enabled` auf `false` wie heute.
- `src/native/openExternal.ts` (`@capacitor/browser`, gepinnt): `Browser.open({ url })`. Der Quelle-Link bekommt den
  `onClick`-Handler (mit `preventDefault`) **nur nativ**; auf Web bleibt er ein normaler Link mit `target="_blank"`.
- Weitere externe Links im Code, falls vorhanden (grep nach `target="_blank"`), laufen über denselben Adapter.

### Acceptance criteria
1. Vitest: `useWakeLock` nativ (gemockt) ruft beim Einschalten `KeepAwake.keepAwake` und beim Ausschalten/Unmount
   `allowSleep` auf; Web-Pfad unverändert (bestehende Tests grün).
2. Vitest: Klick auf den Quelle-Link ruft nativ `Browser.open` mit der URL und verhindert die Navigation; auf Web bleibt das
   Standardverhalten.
3. Der Koch-Modus-Schalter „Bildschirm wach“ ist nativ sichtbar und bedienbar.
4. Prüfzeilen in `docs/native.md`; die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
Andere Links innerhalb der App, Teilen.

### Assumptions
E7 = In-App-Browser.

### Affected areas
`package.json`, `src/native/keepAwake.ts`, `src/native/openExternal.ts` (+ Tests), `src/hooks/useWakeLock.ts`,
`src/pages/RecipeDetail.tsx`, `docs/native.md`.

---

## N5 — Native App: Anmeldung in Preferences speichern

Labels: agent-ready, phase:7, device-check · Depends on: N1

### Context
Spec „Session-Speicher“, E5. `src/api/auth.ts` liest/schreibt die Session synchron in `localStorage["foodly.auth"]` und
liest bei jedem Zugriff neu. iOS kann WebView-`localStorage` leeren; dann wäre man abgemeldet. `@capacitor/preferences`
ist asynchron.

### Goal
Nativ bleibt man angemeldet, auch wenn iOS den WebView-Speicher leert. Web verhält sich wie heute.

### Behaviour
- `src/native/storage.ts` (`@capacitor/preferences`, gepinnt): `loadAuth()`, `saveAuth(value | null)`.
- `auth.ts`: nativ hält ein Speicher-Cache die Session; `bootstrap()` (`src/api/index.ts`) lädt sie vor dem ersten Lesen;
  jedes Schreiben aktualisiert den Cache und schreibt durch. Alle Lesezugriffe bleiben synchron. Web: unverändert
  (`localStorage`, `storage`-Event, `navigator.locks`).
- Migration: gibt es nativ beim Start eine Session in `localStorage`, aber keine in Preferences, wird sie übernommen und
  aus `localStorage` gelöscht.
- Der Datei-Kopf von `auth.ts` und CLAUDE.md (Abschnitt `auth.ts`) beschreiben die neue Invariante.
- Mock-Modus: unverändert (kein `auth.ts`).
- `bootstrap()` kehrt heute im REST-Modus früh zurück; es muss nativ vorher die Session laden. `src/api/index.ts` liest
  beim Laden des Moduls `session.session()` (Cache für Nutzer): nach dem Laden aus Preferences muss eine Änderung gemeldet
  bzw. der Cache neu gesetzt werden.
- Nach einem Refresh wird der Preferences-Schreibvorgang abgewartet, bevor der neue Token genutzt wird (die Backend-
  Rotation macht den alten Refresh-Token ungültig).

### Acceptance criteria
1. Vitest nativ (Preferences gemockt): Anmelden schreibt in Preferences, nicht in `localStorage`; nach einem simulierten
   Neustart (Modul neu laden, Preferences behalten, `localStorage` geleert) ist man nach `bootstrap()` angemeldet.
2. Abmelden und abgelaufener Refresh löschen den Eintrag in Preferences; nach einem Refresh steht der neue Refresh-Token
   in Preferences, bevor die wiederholte Anfrage gesendet wird.
3. Migration aus `localStorage` wie beschrieben.
4. Vor dem Ende von `bootstrap()` rendert die App nicht (bestehende Reihenfolge in `main.tsx`), also kein kurzes
   „abgemeldet“.
5. Alle bestehenden `auth.ts`-Tests (Web) bleiben unverändert grün.
6. Prüfzeile in `docs/native.md` (nur REST-Build: anmelden, App beenden, neu starten → angemeldet).
7. Die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
Verschlüsselter Speicher (Keychain), Timer/Theme/Listen-Zustand umziehen (bekannter Verlust, Spec).

### Assumptions
E5 = Preferences.

### Affected areas
`package.json`, `src/native/storage.ts` (+ Test), `src/api/auth.ts` (+ Test), `src/api/index.ts`, `CLAUDE.md`,
`docs/native.md`.

---

## N6 — Native App: Timer klingeln im Hintergrund

Labels: agent-ready, phase:7, device-check · Depends on: N1

### Context
Spec „Timer-Benachrichtigung (N4)“, E4, E8, E9. Timer laufen in `src/timers/TimerProvider.tsx` (pro Nutzer in
`localStorage`, Tick per `setInterval`), der Alarm `src/timers/alarm.ts` klingelt nur im Vordergrund. Im Hintergrund
pausiert iOS JS, die Android-WebView lässt Timer oft weiterlaufen: dann würde der Tick im Hintergrund `startAlarm` und den
Toast auslösen, zusätzlich zur Benachrichtigung; auf iOS würde `alarm.ts` nach der Rückkehr verspätet klingeln.

### Goal
Läuft ein Timer ab, während die App im Hintergrund oder der Bildschirm gesperrt ist, kommt eine Benachrichtigung mit
Ton. Im Vordergrund bleibt alles wie heute, nie doppelt.

### Behaviour
- `src/native/timerNotifications.ts` (`@capacitor/local-notifications` 8.3.1, `@capacitor/app`, gepinnt):
  - Liefert `isActive()` (Vordergrund-Zustand aus `appStateChange`; Web immer `true`).
  - Start: Android-Kanal `timers` (`createChannel`, Wichtigkeit 5, Systemton, Vibration) anlegen; alle ausstehenden
    stornieren (`getPending()` → `cancel({ notifications })`). `smallIcon` in `capacitor.config.ts` auf ein einfarbiges
    Drawable (`ic_stat_foodly`, aus dem Logo), sonst zeigt Android ein weißes Quadrat.
  - `appStateChange` → inaktiv: für jeden laufenden Timer `schedule` mit `schedule: { at: <Endzeit>, allowWhileIdle: true }`
    (Titel „Foodly“, Text „<Timer-Name> ist fertig“, ohne Namen „Timer ist fertig“; `channelId: 'timers'`; ID = positiver
    int32-Hash der Timer-UUID). → aktiv: alle stornieren.
  - Abmelden bzw. Unmount von `TimerProvider`: alle stornieren.
  - Tippen auf die Benachrichtigung (`localNotificationActionPerformed`): App kommt nach vorn, das Timer-Panel öffnet sich
    (`TimerPanelContext`).
  - Berechtigung: beim Start eines Timers nativ `checkPermissions()`; ist sie `prompt`, folgt `requestPermissions()` (E9);
    abgelehnt → Timer läuft trotzdem.
  - Ohne „genaue Wecker“ plant das Plugin selbst ungenau; N6 prüft das nicht (Hinweis kommt mit N7).
- `TimerProvider`: Läuft ein Timer ab, während `isActive()` `false` ist (Android-Tick im Hintergrund), oder ist seine
  Endzeit bei der Rückkehr schon vorbei (iOS), flippt er auf `expired` **ohne** `startAlarm` und ohne Toast. Läuft er im
  Vordergrund ab, klingelt `alarm.ts` wie heute.
- Web: nichts davon (Adapter No-op).
- Android-Manifest: `SCHEDULE_EXACT_ALARM` von Hand ergänzen (nicht `USE_EXACT_ALARM`); die übrigen Berechtigungen bringt
  das Plugin über das Manifest-Merging mit.

### Acceptance criteria
1. Vitest (Plugins gemockt): zwei laufende Timer, Wechsel in den Hintergrund → zwei `schedule`-Aufrufe mit der Endzeit
   und dem Text; pausierte/abgelaufene Timer werden nicht geplant.
2. Rückkehr in den Vordergrund → `cancel` für alle geplanten IDs.
3. Tick bei `isActive() === false` über die Endzeit → Status `expired`, weder `startAlarm` noch Toast. Rückkehr nach der
   Endzeit ohne Tick dazwischen → ebenso. Ablauf im Vordergrund → `startAlarm` einmal (bestehender Test grün).
4. App-Start und Abmelden stornieren alle ausstehenden Benachrichtigungen.
5. Tippen auf eine Benachrichtigung öffnet das Timer-Panel.
6. Timer-Start nativ mit Berechtigung `prompt` → `requestPermissions` aufgerufen; mit `granted`/`denied` nicht; `denied`
   verhindert den Start nicht.
7. Web: kein Aufruf eines Plugins; Entry-Check aus N1 AK 4.
7a. Geplante Benachrichtigungen haben eine positive int32-ID, gleich für dieselbe Timer-UUID.
8. Prüfzeilen in `docs/native.md` (Timer 1 Min., App in den Hintergrund, Bildschirm sperren → Ton; im Vordergrund kein
   doppelter Alarm; Tippen öffnet das Panel); die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
Hinweise im Timer-Panel (N7), eigener Ton (E8), Push vom Server, Live-Countdown in der Benachrichtigung.

### Assumptions
E4 = a (exakt, wenn erlaubt, sonst ungenau), E8 = Systemton, E9 = beim ersten Timer-Start.

### Affected areas
`package.json`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/drawable*/ic_stat_foodly.*`,
`capacitor.config.ts`, `src/native/timerNotifications.ts`
(+ Test), `src/timers/TimerProvider.tsx` (+ Test), `src/timers/TimerPanelContext.tsx`, `docs/native.md`.

---

## N7 — Native App: Hinweise zu Benachrichtigungen im Timer-Panel

Labels: agent-ready, phase:7, device-check, ui · Depends on: N6

### Context
Spec „Timer-Benachrichtigung (N4)“ und „Screens und Zustände“, E4. Nach N6 klingeln Timer im Hintergrund, wenn die
Berechtigung da ist; ohne sie oder ohne „genaue Wecker“ (Android 14+ Standard: aus) merkt der Nutzer das nicht.

### Goal
Das Timer-Panel sagt nativ, wenn Timer im Hintergrund nicht oder verspätet klingeln, und bietet für genaue Wecker einen
Knopf.

### Behaviour
- `timerNotifications.ts` liefert den Zustand `'ok' | 'denied' | 'inexact'` (neu geprüft beim Öffnen des Panels und bei
  Rückkehr in den Vordergrund): Berechtigung `denied` → `denied`; sonst (auch `prompt`) nur auf Android
  `checkExactNotificationSetting()` ≠ `granted` → `inexact`; sonst `ok`. Auf iOS wird `checkExactNotificationSetting` nie
  aufgerufen.
- `src/timers/TimerPanel.tsx`, nur nativ:
  - `denied`: „Benachrichtigungen sind aus – Timer klingeln nur, solange Foodly offen ist. Du kannst sie in den
    Systemeinstellungen erlauben.“ (kein Link).
  - `inexact` (nur Android): „Timer können sich im Hintergrund um einige Minuten verspäten.“ mit Button „Genaue Wecker
    erlauben“ (postxl `Button`, `variant` laut design.md) → `changeExactNotificationSetting()`.
  - `ok`: nichts.
- Look: ruhiger Hinweistext nach `docs/design.md` (Sekundärtext, kein Alarm-Rot), Tippfläche ≥ 40 px (`touch:`).

### Acceptance criteria
1. Vitest: `denied` → erster Text sichtbar, kein Button; `inexact` → zweiter Text und Button; Klick ruft
   `changeExactNotificationSetting` auf; `ok` → kein Hinweis.
2. Rückkehr in den Vordergrund nach Erlauben → Hinweis verschwindet (Zustand neu geprüft).
3. Web: kein Hinweis, kein Plugin-Aufruf. iOS (gemockt): kein Aufruf von `checkExactNotificationSetting`; Berechtigung
   `prompt` → kein Hinweis.
4. Prüfzeilen in `docs/native.md`; die fünf Checks und `npm run cap:sync` laufen durch.

### Non-goals
Einstellungen-Link (kein Plugin), Hinweise außerhalb des Timer-Panels.

### Assumptions
E4 = a.

### Affected areas
`src/native/timerNotifications.ts`, `src/timers/TimerPanel.tsx` (+ Test), `docs/native.md`.

---

## Backend-Issues

Keine. Für einen REST-Build braucht das Deployment `CORS_ALLOWED_ORIGINS` mit `capacitor://localhost` und
`https://localhost` sowie ein über HTTPS erreichbares Backend. Das trägt N1 als B20 (Hinweis) in
`docs/backend-questions.md` und in `docs/native.md` ein; ein Backend-Issue lege ich nur an, wenn die Owner es wollen.

## QA-Journeys (Gerätetest durch Kolja/Daniel nach N7, Checkliste `docs/native.md`)

1. Android und iOS: App installieren, Icon und Splash (hell/dunkel), Startseite mit Mock-Daten, Safe Areas oben/unten,
   Statusleiste in beiden Themes lesbar.
2. Navigation: Rezeptliste → Detail → Koch-Modus → Zurück-Taste (Android) schließt erst ein offenes Sheet, dann zurück,
   auf der Startseite schließt sie die App.
3. Koch-Modus: „Bildschirm wach“ an → Bildschirm geht nicht aus; Quelle-Link öffnet im In-App-Browser, Zurück führt ins
   Rezept.
4. Timer 1 Min. starten (Berechtigung erlauben), App in den Hintergrund, Bildschirm sperren → Benachrichtigung mit Ton;
   Tippen öffnet das Timer-Panel; im Vordergrund klingelt nur der In-App-Alarm.
5. Berechtigung ablehnen → Hinweis im Panel; Android 14+: Hinweis „verspäten“, Knopf öffnet die Einstellung.
6. Sobald ein Backend erreichbar ist (REST-Build): anmelden, App beenden, neu starten → weiter angemeldet.
Befunde sammelt ein Issue „Gerätetest Phase 7: Befunde“, das der Lead nach dem Merge von N7 anlegt.

## Review-Log

- 2026-11-23, unabhängiges Review (1 Blocker, 4 Major, 7 Minor), eingearbeitet: N1 erst nach E1 anlegen (Platzhalter
  `<APP_ID>`); `platform.ts` ohne statischen Core-Import, Entry-Check als prüfbarer `grep`; N4-Link-Handler nur nativ
  (sonst zwei Tabs auf Web); N6 berücksichtigt weiterlaufende Android-Ticks (`isActive()`); `Info.plist`-Texte in N1;
  B20 und Befund-Issue zugeordnet; `icon-only.png`, Rasterung, Splash-Fallback vor `bootstrap()`; N6-Plugin-Details
  (`schedule.allowWhileIdle`, `getPending`/`cancel`, int32-IDs, `checkPermissions`→`requestPermissions`, `smallIcon`,
  Manifest-Merging, Exakt-Prüfung erst in N7); N7 `prompt`→`ok`, iOS ohne Exakt-Prüfung, Bedingung gestrichen; N3 mit
  `Select`; N5 mit Umbau von `bootstrap()`, Cache in `index.ts` und abgewartetem Schreiben nach Refresh.
