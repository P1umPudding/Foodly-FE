# Phase 7 — Native App mit Capacitor — Design

> Entwurf 2026-11-23 (Lead). Auftrag: Daniel, 2026-11-23 („Phase 7 schneiden“). Offene Entscheidungen unten.

## Ziel

Foodly läuft als installierbare App auf Android und iOS. Die App ist dieselbe SPA in einer nativen Hülle (Capacitor 8),
startet ohne Browser-Leiste, verhält sich auf dem Gerät wie eine App (Zurück-Taste, Statusleiste, Splash, Icon) und nutzt
dort Geräte-Funktionen, wo das Web nicht reicht: **Timer klingeln auch bei gesperrtem Bildschirm**, der Bildschirm bleibt im
Koch-Modus wach. Die Web-App bleibt unverändert nutzbar; alles Native ist ein Zusatz.

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

- `capacitor.config.ts` im Repo-Root: `appId`, `appName`, `webDir: 'dist'`.
- `android/` und `ios/` werden committet (Capacitor-Standard). Build-Artefakte stehen in `.gitignore`.
- Neue Skripte: `build:native` (Vite-Build mit `--mode native`, `base` = `/`) und `cap:sync` (`build:native` + `cap sync`).
- `.env.native` (committet, nicht geheim): `VITE_MOCK=1` als Standard, solange es kein Backend gibt. Für einen REST-Build
  setzt man `VITE_API_URL=https://…/api/v1` in `.env.native.local`. `vite.config.ts` erzwingt für `--mode native`, dass entweder `VITE_MOCK=1`
  oder ein absoluter `VITE_API_URL` gesetzt ist (sonst Build-Fehler mit Hinweis).
- `previewBase` / Skaile-Vorschau bleiben unberührt.
- Router bleibt `BrowserRouter`: Capacitor liefert für unbekannte Pfade `index.html` aus.

### Session-Speicher

`localStorage` in der WebView kann iOS unter Speicherdruck leeren; dann wäre man abgemeldet. Nativ speichert
`auth.ts` die Session über `@capacitor/preferences` (Adapter `src/native/storage.ts`), Web bleibt bei `localStorage`.
Die Schnittstelle von `auth.ts` bleibt gleich; da Preferences asynchron ist, liest `auth.ts` beim Start einmal in einen
Speicher-Cache und schreibt durch. Die Tab-übergreifende Logik (`navigator.locks`, `storage`-Event) ist nativ ohne Wirkung
(eine WebView), bleibt aber für Web. (Siehe Entscheidung E5.)

## Funktionen (nativ)

| # | Funktion | Nativ | Web (unverändert) |
|---|---|---|---|
| N1 | Hülle | Statusleiste passend zum Theme (hell/dunkel), Splash bis zum ersten Render, App-Icon + Splash aus `public/icons` | — |
| N2 | Android-Zurück-Taste | geht im Verlauf zurück; auf der Startseite schließt sie die App; offene Sheets/Dialoge schließt sie zuerst | — |
| N3 | Bildschirm wach | `@capacitor-community/keep-awake` in `useWakeLock` | Wake Lock API |
| N4 | Timer-Alarm im Hintergrund | Beim Start eines Timers plant die App eine lokale Benachrichtigung zur Endzeit (`@capacitor/local-notifications`, Ton + Text „<Name> ist fertig“); Stoppen/Löschen/Ändern storniert bzw. plant neu. Im Vordergrund klingelt wie heute `alarm.ts` (die Benachrichtigung wird dann nicht zusätzlich angezeigt). Berechtigung wird beim ersten Timer-Start erfragt; abgelehnt = Hinweis im Timer-Panel, Timer läuft trotzdem | nur Vordergrund |
| N5 | Session-Speicher | Preferences | localStorage |
| N6 | Externe Links | Quelle-Links öffnen im System-Browser (`@capacitor/browser` oder `window.open` mit `_system`), nicht in der App-WebView | neues Tab |

Bild-Upload braucht nichts Natives: `<input type=file>` öffnet in beiden WebViews die System-Auswahl (Kamera/Galerie).
Android braucht dafür keine Extra-Berechtigung; iOS braucht `NSCameraUsageDescription` und
`NSPhotoLibraryUsageDescription` in `Info.plist` (Text auf Deutsch).

## Screens und Zustände

Keine neuen Screens. Änderungen:
- **Timer-Panel:** Hinweis „Benachrichtigungen sind aus – Timer klingeln nur, solange Foodly offen ist.“ mit Link
  „Einstellungen öffnen“, wenn nativ die Berechtigung fehlt. Wortlaut und Look nach `docs/design.md`.
- **Login:** unverändert. Im Mock-Build gibt es keinen Login (wie heute in `VITE_MOCK=1`).
- **Offline/kein Netz** (REST-Build): bestehende Fehlerzustände reichen; Offline ist Phase 8.

## Prüfung

Worker arbeiten in einem Linux-Container ohne Android-SDK und Xcode. Deshalb:
- Jedes Issue: die fünf lokalen Checks aus CLAUDE.md, dazu `npm run cap:sync` ohne Fehler (sobald es existiert).
- Adapter werden mit Vitest getestet (Capacitor-Plugins gemockt; Web-Fallback und nativer Zweig).
- **Gerätetest** (APK auf Android, Xcode-Run auf iOS) machen Kolja/Daniel nach dem Merge anhand einer Checkliste in
  `docs/native.md` (Build-Anleitung + Prüfliste je Funktion). Befunde werden neue Issues.

## Backend-Abhängigkeiten

Keine neuen Endpunkte oder Felder. Für einen REST-Build braucht das Deployment:
- `CORS_ALLOWED_ORIGINS` mit `capacitor://localhost` und `https://localhost` (reine Konfiguration; Backend erlaubt
  `Authorization` schon explizit, B7).
- ein von Geräten erreichbares Backend über HTTPS (Android blockiert Klartext-HTTP standardmäßig; für lokale Tests
  im LAN optional `server.cleartext` nur im Debug — siehe E6).
Eintrag als B19 in `docs/backend-questions.md` (Hinweis, kein Blocker). Ein Backend-Issue ist nicht nötig.

## Nicht im Umfang

Store-Veröffentlichung (Store-Konten, Datenschutzerklärung, Screenshots, Review), Push-Benachrichtigungen vom Server,
Offline/Cache (Phase 8), Deep Links/Universal Links, natives Teilen (kommt mit Teilen/Backend #12), Kamera-Plugin,
Biometrie, Live-Updates, CI-Builds (keine GitHub Actions, ADR 0004).

## Risiken

- **Keine Geräte im Worker:** Fehler auf echten Geräten fallen erst beim manuellen Test auf → Checkliste + Folge-Issues.
- **iOS ohne Mac:** `cap add ios` / `cap sync ios` laufen unter Linux mit SPM ohne CocoaPods; bauen nur auf dem Mac.
- **Benachrichtigungen:** Android 13+ braucht die Laufzeit-Berechtigung, exakte Alarme (Android 12+) brauchen
  `SCHEDULE_EXACT_ALARM` oder dürfen ungenau sein (Minuten-Versatz) → E4.
- **Bundle-Größe:** Plugins nur dynamisch laden, sonst wächst der Web-Entry.
- **Async-Session (N5):** Startpfad muss auf das Laden warten, sonst kurz „abgemeldet“ → `bootstrap()` lädt vorher.

## Offene Entscheidungen

| # | Frage | Optionen | Empfehlung |
|---|---|---|---|
| E1 | App-ID und Name | a) `de.foodly.app` / „Foodly“ b) eigene Domain-ID der Owner | a), falls es keine eigene Domain gibt; die ID ist nach Store-Veröffentlichung nicht mehr änderbar |
| E2 | Plattformen | a) Android + iOS gleichzeitig b) Android zuerst, iOS danach | a): Aufwand im Code fast gleich; iOS braucht nur einen Mac zum Bauen |
| E3 | Verteilung in Phase 7 | a) nur Test-Builds (APK, Xcode/TestFlight) b) gleich Store-Veröffentlichung | a): ohne Backend lohnt kein Store-Eintrag; Store wird ein eigener Block |
| E4 | Timer-Benachrichtigung | a) exakt (Android `SCHEDULE_EXACT_ALARM`, Nutzer muss es ggf. erlauben) b) ungenau (bis ~1 Min. später, keine Extra-Berechtigung) c) keine Hintergrund-Alarme | a): ein Küchen-Timer muss pünktlich klingeln |
| E5 | Session-Speicher nativ | a) Preferences b) localStorage lassen | a): sonst droht auf iOS Abmeldung |
| E6 | API im nativen Build ohne Backend | a) Mock-Build als Standard, REST per `.env.native.local` b) nur REST | a): sonst ist die App heute nicht testbar |
