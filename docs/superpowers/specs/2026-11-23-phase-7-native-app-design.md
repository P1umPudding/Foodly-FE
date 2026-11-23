# Phase 7 — Native App mit Capacitor — Design

> Entwurf 2026-11-23 (Lead). Auftrag: Daniel, 2026-11-23 („Phase 7 schneiden“). Offene Entscheidungen unten.

## Ziel

Foodly läuft als installierbare App auf Android und iOS. Die App ist dieselbe SPA in einer nativen Hülle (Capacitor 8),
startet ohne Browser-Leiste, verhält sich auf dem Gerät wie eine App (Zurück-Taste, Statusleiste, Splash, Icon) und nutzt
dort Geräte-Funktionen, wo das Web nicht reicht: **Timer klingeln auch bei gesperrtem Bildschirm**, der Bildschirm bleibt im
Koch-Modus wach. Die Web-App bleibt unverändert nutzbar; alles Native ist ein Zusatz. Die App-Store-Präsenz aus
`plan.md` ist Ziel der Phase, aber nicht dieses Schnitts: ob sie jetzt oder als eigener Block kommt, entscheidet E3.

Es gibt noch kein erreichbares Backend (Daniel, 2026-11-23). Phase 7 muss deshalb **ohne Backend** fertig und prüfbar sein:
Standard ist ein Mock-Build, ein REST-Build mit absoluter URL ist vorbereitet.

## Ausgangslage im Code

- SPA: Vite 7, React 18, `BrowserRouter basename={import.meta.env.BASE_URL}`, `base` aus `src/previewBase.ts` (sonst `/`).
- Phase 6: Manifest + Icons (`public/manifest.webmanifest`, `public/icons/`), `viewport-fit=cover`, Safe-Area-Abstände,
  `touch:`-Variante, 40-px-Tippflächen, Code-Splitting.
- Wake Lock: `src/hooks/useWakeLock.ts` (Screen Wake Lock API; WKWebView erst ab iOS 18.4).
- Timer: `src/timers/TimerProvider.tsx`, `src/timers/alarm.ts` (WebAudio + `navigator.vibrate`, nur im Vordergrund).
- Session: `src/api/auth.ts`, Tokens in `localStorage["foodly.auth"]`.
- API-Basis: `VITE_API_URL` (Default relativ `/api/v1`) in `src/api/http.ts`. Relativ funktioniert nativ nicht: die
  WebView wird von `https://localhost` (Android) bzw. `capacitor://localhost` (iOS) ausgeliefert.

## Architektur

### Neues Modul `src/native/`

Einzige Stelle, die `@capacitor/*` importiert (analog zu „Datenzugriff nur über `src/api`“, `docs/architecture.md` §1).

- `platform.ts` — `isNative()` (`Capacitor.isNativePlatform()`), `platform()` (`'web' | 'android' | 'ios'`).
- Je Funktion ein kleiner Adapter mit **Web-Fallback**, z. B. `keepAwake.ts`, `notifications.ts`, `appShell.ts`
  (Statusleiste, Splash, Zurück-Taste). Komponenten und Hooks rufen nur diese Adapter auf, nie Capacitor direkt.
- Plugins werden in den Adaptern **dynamisch** importiert (`await import('@capacitor/…')`), damit der Web-Entry nicht wächst
  (#309).
- Eine ESLint-Regel (`no-restricted-imports` für `@capacitor/*` außerhalb `src/native/`) hält das fest.

Neue Decision-Note `docs/decisions/0005-native-shell.md`: Capacitor, `src/native/` als Grenze, Web bleibt Primärziel.

### Build und Projekte

- `capacitor.config.ts` im Repo-Root: `appId`, `appName`, `webDir: 'dist'`. Geprüft am 2026-11-23 im Linux-Container:
  `cap add android`, `cap add ios` (Swift Package Manager, ohne CocoaPods/Xcode) und `cap sync` laufen mit Capacitor 8.6.2,
  `@capacitor-community/keep-awake` 8.0.1 und `@capacitor/local-notifications` 8.3.1. Versionen werden exakt gepinnt.
- `android/` und `ios/` werden committet (Capacitor-Standard). Build-Artefakte stehen in `.gitignore`.
- Neue Skripte: `build:native` (Vite-Build mit `--mode native`; `base` ist dann immer `/`, auch wenn
  `SKAILE_PREVIEW_BASE` gesetzt ist; Capacitor 8 braucht Node ≥ 22) und `cap:sync` (`build:native` + `cap sync`).
- `.env.native` (committet, nicht geheim): `VITE_MOCK=1` als Standard, solange es kein Backend gibt. Für einen REST-Build
  setzt man `VITE_API_URL=https://…/api/v1` in `.env.native.local`. `vite.config.ts` erzwingt für `--mode native`, dass entweder `VITE_MOCK=1`
  oder ein absoluter `VITE_API_URL` gesetzt ist (sonst Build-Fehler mit Hinweis).
- `previewBase` / Skaile-Vorschau bleiben unberührt.
- Router bleibt `BrowserRouter`: Capacitor liefert für unbekannte Pfade `index.html` aus.

### Session-Speicher

`localStorage` in der WebView kann iOS unter Speicherdruck leeren; dann wäre man abgemeldet. Nativ speichert
`auth.ts` die Session über `@capacitor/preferences` (Adapter `src/native/storage.ts`), Web bleibt bei `localStorage`
(Entscheidung E5).

- **Neue Invariante (ersetzt „liest bei jedem Zugriff localStorage neu“):** Nativ ist ein Speicher-Cache in `auth.ts` die
  Quelle; jeder Schreibvorgang geht durch in Preferences. Web bleibt wie heute.
- `bootstrap()` lädt die Session aus Preferences **vor** dem ersten Lesen; danach bleiben alle Lesezugriffe synchron
  (auch der schnelle Pfad für den aktuellen Access-Token).
- `navigator.locks` und das `storage`-Event bleiben für Web; nativ gibt es nur eine WebView.
- Im Mock-Build läuft `auth.ts` nicht; N5 wird deshalb am Gerät nur im REST-Build geprüft (sobald ein Backend da ist).
- **Bekannter Verlust:** Timer, Theme, Listen-Zustand und „Zuletzt angesehen“ bleiben in `localStorage`. Leert iOS den
  Speicher, sind sie weg, man bleibt aber angemeldet. Das ist hinnehmbar; dauerhafter Speicher kommt mit Phase 8.

## Funktionen (nativ)

| # | Funktion | Nativ | Web (unverändert) |
|---|---|---|---|
| N1 | Hülle | Statusleisten-**Symbole** passend zum Theme (hell/dunkel; die Hintergrundfarbe greift bei Android 15+ edge-to-edge nicht, die Safe-Area-Abstände aus Phase 6 tragen das Layout), Splash bis zum ersten Render, App-Icon + Splash aus neuen Quelldateien (`assets/icon.png` 1024 px, `assets/splash.png` 2732 px, aus `public/favicon.svg` abgeleitet) per `@capacitor/assets` | — |
| N2 | Android-Zurück-Taste | siehe „Zurück-Taste“ unten | — |
| N3 | Bildschirm wach | `@capacitor-community/keep-awake` in `useWakeLock` (Android-WebView und iOS < 18.4 haben keine Wake Lock API) | Wake Lock API |
| N4 | Timer-Alarm im Hintergrund | siehe „Timer-Benachrichtigung“ unten | nur Vordergrund |
| N5 | Session-Speicher | Preferences | localStorage |
| N6 | Externe Links | Quelle-Link (`RecipeDetail.tsx`) öffnet je nach E7 im In-App-Browser (`@capacitor/browser`: Custom Tabs bzw. SFSafariViewController) oder im System-Browser, nie in der App-WebView. Umsetzung über den Adapter `src/native/openExternal.ts` | neues Tab |

### Zurück-Taste (N2)

`src/native/appShell.ts` hört auf `backButton` (`@capacitor/app`):
1. Ist ein Overlay offen (`[role="dialog"][data-state="open"]` bzw. `[role="menu"]`, postxl baut auf Radix), schickt es ein
   `Escape`-Keydown an `document.activeElement` bzw. das oberste Overlay. Radix schließt dann wie bei der Taste; es braucht
   keine Registry in den ~30 Dialog/Sheet-Stellen.
2. Sonst, wenn der Pfad (nach `basename`) nicht `/` ist: `history.back()`; gibt es keinen Verlauf (`canGoBack` false), zur
   Startseite `/` navigieren.
3. Auf `/`: `App.exitApp()`.

### Timer-Benachrichtigung (N4)

Nur nativ, Adapter `src/native/timerNotifications.ts`, angesteuert aus `TimerProvider`:
- **Kanal:** Android-Kanal `timers` mit hoher Wichtigkeit und Systemton (`createChannel` beim Start). Ein eigener Ton ist
  E8.
- **Planen beim Wechsel in den Hintergrund:** Bei `appStateChange` → inaktiv plant die App für jeden laufenden Timer eine
  Benachrichtigung zur Endzeit (Titel „Foodly“, Text „<Timer-Name> ist fertig“). Bei → aktiv storniert sie alle
  Foodly-Benachrichtigungen. So gibt es im Vordergrund nie doppelte Alarme, und es bleiben keine verwaisten Einträge.
- **Rückkehr:** Timer, die im Hintergrund abgelaufen sind, zeigen nach der Rückkehr den Abgelaufen-Zustand, **ohne** dass
  `alarm.ts` verspätet klingelt (die Benachrichtigung hat schon geklingelt). Im Vordergrund klingelt `alarm.ts` wie heute.
- **Tippen auf die Benachrichtigung** öffnet die App; das Timer-Panel öffnet sich mit dem abgelaufenen Timer.
- **Start der App** (auch nach Beenden durch das System): zuerst alle ausstehenden Foodly-Benachrichtigungen stornieren.
  **Abmelden** storniert ebenfalls alle (Timer gehören pro Nutzer).
- **Berechtigung:** Zeitpunkt der Abfrage ist E9. Abgelehnt: Hinweis im Timer-Panel „Benachrichtigungen sind aus – Timer
  klingeln nur, solange Foodly offen ist. Du kannst sie in den Systemeinstellungen erlauben.“ (ohne Link: weder Core noch
  `@capacitor/app` öffnen die App-Einstellungen; ein Extra-Plugin lohnt dafür nicht).
- **Exakte Alarme (Android):** siehe E4. Ist die Einstellung aus (Android 14+ Standard), zeigt das Timer-Panel
  „Timer können sich im Hintergrund um einige Minuten verspäten.“ mit Knopf „Genaue Wecker erlauben“
  (`changeExactNotificationSetting`); geprüft wird mit `checkExactNotificationSetting`.

Bild-Upload braucht nichts Natives: `<input type=file>` öffnet in beiden WebViews die System-Auswahl (Kamera/Galerie).
Android braucht dafür keine Extra-Berechtigung; iOS braucht `NSCameraUsageDescription` und
`NSPhotoLibraryUsageDescription` in `Info.plist` (Text auf Deutsch).

## Screens und Zustände

Keine neuen Screens. Änderungen:
- **Timer-Panel (nur nativ):** zwei Hinweise aus N4 (Benachrichtigungen aus; genaue Wecker aus). Look nach
  `docs/design.md` (ruhiger Hinweistext, kein Alarm-Rot). Web zeigt keinen der beiden.
- **Login:** unverändert. Im Mock-Build gibt es keinen Login (wie heute in `VITE_MOCK=1`).
- **Offline/kein Netz** (REST-Build): bestehende Fehlerzustände reichen; Offline ist Phase 8.

## Prüfung

Worker arbeiten in einem Linux-Container ohne Android-SDK und Xcode. Deshalb:
- Jedes Issue: die fünf lokalen Checks aus CLAUDE.md, dazu `npm run cap:sync` ohne Fehler (sobald es existiert).
- Adapter werden mit Vitest getestet (Capacitor-Plugins gemockt; Web-Fallback und nativer Zweig).
- **Gerätetest** (APK auf Android, Xcode-Run auf iOS) machen Kolja/Daniel anhand einer Checkliste in `docs/native.md`
  (Build-Anleitung + Prüfliste je Funktion, inklusive Safe Areas aus Phase 6 auf Android und N5 im REST-Build). Weil das
  erst nach dem Merge geht, tragen die Issues das Label `device-check`; nach dem Gerätetest sammelt ein Issue
  „Gerätetest Phase 7: Befunde“ alles Gefundene.

## Backend-Abhängigkeiten

Keine neuen Endpunkte oder Felder. Für einen REST-Build braucht das Deployment:
- `CORS_ALLOWED_ORIGINS` mit `capacitor://localhost` und `https://localhost` (reine Konfiguration; Backend erlaubt
  `Authorization` schon explizit, B7).
- ein von Geräten erreichbares Backend über HTTPS. Mit `androidScheme: 'https'` blockiert die WebView `http://`-APIs als
  Mixed Content; für einen lokalen LAN-Test ist `androidScheme: 'http'` + `cleartext` nur als lokale, nicht committete
  Abweichung in `docs/native.md` beschrieben.
Eintrag als B19 in `docs/backend-questions.md` (Hinweis, kein Blocker). Vorschlag: kein Backend-Issue, nur der Hinweis im
Deployment, sobald ein Backend läuft (die Owner bestätigen das mit der Freigabe).

## Nicht im Umfang

Store-Veröffentlichung, falls E3 = a (Store-Konten, Datenschutzerklärung, Screenshots, Review), Push-Benachrichtigungen vom Server,
Offline/Cache (Phase 8), Deep Links/Universal Links, natives Teilen (kommt mit Teilen/Backend #12), Kamera-Plugin,
Biometrie, Live-Updates, CI-Builds (keine GitHub Actions, ADR 0004).

## Risiken

- **Keine Geräte im Worker:** Fehler auf echten Geräten fallen erst beim manuellen Test auf → Checkliste + Folge-Issues.
- **iOS ohne Mac:** `cap add ios` / `cap sync ios` laufen unter Linux (geprüft); bauen und testen geht nur auf einem Mac (E2).
- **Benachrichtigungen:** Android 13+ braucht die Laufzeit-Berechtigung. Exakte Alarme brauchen `SCHEDULE_EXACT_ALARM`,
  das ab Android 14 standardmäßig aus ist; `USE_EXACT_ALARM` erlaubt Google Play nur Wecker-/Timer-Apps. Ungenaue Alarme
  können sich im Doze-Modus um viele Minuten verspäten → E4.
- **Zurück-Taste über Escape:** hängt am Radix-Verhalten der postxl-Overlays; der Adapter-Test deckt Dialog, Sheet und Menü ab.
- **Bundle-Größe:** Plugins nur dynamisch laden, sonst wächst der Web-Entry.
- **Async-Session (N5):** Startpfad muss auf das Laden warten, sonst kurz „abgemeldet“ → `bootstrap()` lädt vorher.

## Offene Entscheidungen

| # | Frage | Optionen | Empfehlung |
|---|---|---|---|
| E1 | App-ID (Reverse-Domain, nach Store-Veröffentlichung nicht mehr änderbar) und App-Name | z. B. `de.<eure-domain>.foodly` oder `io.github.klassenserver7b.foodly`; Name „Foodly“ | keine: hängt davon ab, welche Domain euch gehört |
| E2 | Plattformen und wer baut | a) Android + iOS gleichzeitig (`ios/` wird committet, iOS baut wer einen Mac hat) b) Android zuerst, iOS später | a), wenn einer von euch einen Mac hat; sonst b) |
| E3 | Verteilung in Phase 7 | a) nur Test-Builds (APK, Xcode/TestFlight) b) gleich Store-Veröffentlichung | a): ohne Backend lohnt kein Store-Eintrag; Store wird ein eigener Block |
| E4 | Timer im Hintergrund (Android) | a) `SCHEDULE_EXACT_ALARM` anfragen, Hinweis + Knopf „Genaue Wecker erlauben“, sonst ungenau b) nur ungenau (kann sich im Doze um Minuten verspäten) c) keine Hintergrund-Alarme | a): pünktlich, wenn der Nutzer es erlaubt, ohne Play-Richtlinien-Risiko von `USE_EXACT_ALARM` |
| E5 | Session-Speicher nativ | a) Preferences b) localStorage lassen | a): sonst droht auf iOS Abmeldung |
| E6 | API im nativen Build ohne Backend | a) Mock-Build als Standard, REST per `.env.native.local` b) nur REST | a): sonst ist die App heute nicht testbar |
| E7 | Externe Links | a) In-App-Browser (`@capacitor/browser`) b) System-Browser | a): man bleibt in der App, Zurück führt ins Rezept |
| E8 | Timer-Ton | a) Systemton b) eigener Ton (Datei in `res/raw` und im iOS-Bundle) | a) für Phase 7; ein eigener Ton kann später kommen |
| E9 | Wann fragt die App nach Benachrichtigungen | a) beim ersten Timer-Start b) beim ersten App-Start | a): die Frage kommt, wenn man versteht wofür |

## Review-Log

- 2026-11-23, unabhängiges Review (2 Blocker, 6 Major, 5 Minor), alle eingearbeitet: N4 mit Mechanik (Planen beim
  Wechsel in den Hintergrund, Stornieren bei Rückkehr/Start/Abmelden, kein verspäteter In-App-Alarm, Kanal, Tippen);
  E4 korrigiert (Android 14+, Play-Richtlinie, Doze); Link „Einstellungen öffnen“ gestrichen; N5-Invariante,
  Laden in `bootstrap()`, bekannter Verlust anderer `localStorage`-Daten; Zurück-Taste über Escape an Radix-Overlays;
  `cap add ios/android` + `cap sync` unter Linux geprüft, Versionen gepinnt; Statusleiste nur Symbolfarbe;
  Cleartext-Hinweis korrigiert; N6 als E7; Quell-Assets 1024/2732 px; `base` = `/` erzwungen; Label `device-check`;
  Store als E3 statt Nicht-Ziel; neue E7–E9; E1 ohne Empfehlung.
