# Anmelden, Registrieren, Abmelden (echte Auth) — Design

Stand 2026-11-08. Auslöser: Backend-PR #20 (`auth-flow` → `main`, schließt Backend #15 / B7).
Produktentscheidungen (Daniel, 2026-11-08, Karten an Kolja und Daniel):

- **Registrierung offen:** Es gibt eine Register-Seite, jeder kann ein Konto anlegen.
- **Angemeldet bleiben:** Tokens liegen in `localStorage`. Man bleibt bis zu 30 Tage
  angemeldet, über Browser-Neustarts und Tabs hinweg.

Backend-Vertrag: `docs/backend-questions.md` B7 (Abschnitt „Stand 2026-11-08“) und im Backend
`resources/md/02_API_Design.md` „Authentication & Account“ auf `auth-flow`.

**Blockiert durch:** Backend-PR #20. Die Issues A1–A3 dürfen erst gemergt werden, wenn #20 auf
`main` ist, weil die App danach ohne Login nicht mehr gegen das Backend läuft. Gebaut und getestet
werden sie mit gemocktem `fetch`, gegen den Vertrag oben.

## Ziel

Die App läuft im REST-Modus als echter Nutzer. Wer nicht angemeldet ist, landet auf „Anmelden“.
Danach geht es zurück zur ursprünglichen Seite. Der statische `DEV_TOKEN` verschwindet. Im
Mock-Modus (`VITE_MOCK=1`) ändert sich nichts: kein Login, Nutzer 1.

## Nicht im Umfang

Passwort ändern oder zurücksetzen, Konto löschen, E-Mail-Bestätigung und „Von allen Geräten
abmelden“ (`DELETE /auth/sessions`). Das Backend hat für die ersten drei keine Endpunkte; der
letzte ist eine spätere Profil-Option. Profilseite und Profilbild sind ebenfalls nicht dabei.

## Backend in Kürze

| Aufruf | Body | Antwort |
|---|---|---|
| `POST /auth/register` | `{ name, email, password }` | 201 `{ user, accessToken, refreshToken }` · 409 E-Mail vergeben · 422 Validierung (Passwort < 8 Zeichen, leerer Name/E-Mail) |
| `POST /auth/login` | `{ email, password }` | 200 wie oben · 401 falsche Daten (keine Unterscheidung, ob die E-Mail existiert) |
| `POST /auth/refresh` | `{ refreshToken }` | 200 `{ accessToken, refreshToken }` · 401 abgelaufen/benutzt |
| `POST /auth/logout` | `{ refreshToken }`, mit Bearer | 204 |

- Access-Token: JWT, Ablauf im Claim `exp` (Standard 15 Min.), **kein** `expiresIn` in der Antwort.
- Refresh-Token: opak, 30 Tage, **rotiert**. Nach einem Refresh ist der alte Token sofort ungültig.
- Rate-Limit: register, login und refresh teilen sich pro IP 5 Anfragen pro Minute (Burst 5).
  Antwort 429 mit `{ error: { code: "TOO_MANY_REQUESTS", message } }`.
- Alle übrigen Routen antworten ohne gültigen Bearer mit 401 `UNAUTHORIZED`.

Daraus folgt die wichtigste Regel: **Es läuft immer höchstens ein Refresh gleichzeitig, auch über
mehrere Tabs.** Zwei parallele Refreshes mit demselben Token loggen einen davon aus und verbrauchen
das knappe Rate-Limit.

## Architektur

### Sitzung in `src/api/auth.ts` (neu)

- Ein Modul hält die Sitzung `{ accessToken, refreshToken, userId } | null`, gespeichert unter
  `localStorage["foodly.auth"]`. Das ist der einzige Ort, der die Tokens liest oder schreibt.
  `userId` kommt aus `user.id` der Login-/Register-Antwort bzw. aus dem `sub`-Claim.
- `getAccessToken(): Promise<string | null>` liefert einen gültigen Token. Läuft er in weniger als
  30 s ab (`exp` aus dem JWT-Payload, base64url, ohne Signaturprüfung), wird vorher refresht.
- **Refresh, single-flight:**
  - Innerhalb eines Tabs teilen sich alle Aufrufer ein laufendes Promise.
  - Über Tabs hinweg läuft der Refresh in `navigator.locks.request('foodly-auth-refresh', …)`. Nach
    dem Erhalt des Locks wird `localStorage` neu gelesen. Hat ein anderer Tab schon refresht, wird
    dessen Token benutzt und kein zweiter Request geschickt.
  - Fallback ohne Web Locks (alte Browser, jsdom): nur die Single-flight-Sperre im Tab.
- **Abmelden durch den Server:** Antwortet `refresh` mit 401, wird die Sitzung gelöscht und das
  Ereignis `signed-out` mit Grund `expired` ausgelöst.
- `subscribe(listener)` für Änderungen. Das `storage`-Event hält andere Tabs synchron: Ab- und
  Anmelden in einem Tab gilt für alle.
- `signIn`, `signUp`, `signOut` als `foodly.auth.*` in `src/api/index.ts` (Architektur §1: Daten
  nur über `foodly.*`). `signOut` schickt `POST /auth/logout`, löscht die Sitzung auch dann, wenn
  der Request fehlschlägt, und setzt die Caches zurück (`resetTagIconCache`, `setStubUser(null)`).
- Mock-Modus: `foodly.auth` meldet immer „angemeldet als Nutzer 1“, `signIn`/`signUp` lösen sofort
  auf, `signOut` ist ein No-op. Es gibt keinen Mock-Login-Screen.

### REST-Client `src/api/rest.ts`

- `DEV_TOKEN` entfällt. `request`, `requestBinary` und `requestBlob` holen den Token über
  `getAccessToken()`. Ohne Sitzung wird der Request ohne `Authorization` geschickt.
- Bei 401 auf einer geschützten Route: einmal refreshen und den Request **einmal** wiederholen.
  Schlägt das fehl, ist die Sitzung beendet (`expired`), und der ursprüngliche Aufruf wirft einen
  `Error` wie bisher.
- Die `/auth/*`-Aufrufe laufen ohne Refresh-Retry, damit es keine Schleife gibt.
- 429 liefert die Backend-Meldung als `Error`, wie heute schon `errorMessage`.

### Routing und Guard (`src/App.tsx`, Architektur §5)

- Neue Routen `/login` und `/register`, **außerhalb** von `AppShell` und `CatalogProvider`: kein
  Laden der Kataloge ohne Sitzung.
- Alle übrigen Routen hängen an einem `RequireAuth`. Ohne Sitzung leitet er mit `replace` auf
  `/login?next=<pfad+query>` um; `next` wird nur als app-interner Pfad übernommen (beginnt mit `/`,
  nicht mit `//`).
- Wer angemeldet `/login` oder `/register` öffnet, landet auf `/recipes`.
- Endet die Sitzung während der Nutzung (`expired`, Abmelden in einem anderen Tab), springt der
  Guard auf `/login?next=…`. Bei `expired` zeigt die Login-Seite den Hinweis „Deine Anmeldung ist
  abgelaufen. Bitte melde dich neu an.“
- `CatalogProvider` lädt `me` neu, wenn sich die Sitzung ändert (anderer Nutzer). Am einfachsten:
  `CatalogProvider` mit `key={userId}` unter dem Guard.

## Seiten

Look nach `docs/design.md` und Redesign „Ruhig“. Nur `@postxl/ui-components` + Tailwind-Tokens
(CLAUDE.md, Architektur §6). Design-Notiz vom Foodly Designer: siehe Review-Log unten.

**Anmelden (`/login`)**
- Zentrierte Karte, max. ca. 24 rem breit; auf dem Handy volle Breite mit Seitenrand. Oben das
  App-Logo bzw. der Name „Foodly“, Überschrift „Anmelden“.
- Felder: „E-Mail“ (`type=email`, `autocomplete=email`, Autofokus) und „Passwort“
  (`type=password`, `autocomplete=current-password`).
- Primärknopf „Anmelden“, während des Requests deaktiviert mit Ladeanzeige. Enter schickt ab.
- Darunter der Link „Noch kein Konto? Registrieren“ → `/register` (übernimmt `next`).
- Fehler als Hinweis über dem Knopf, Fokus bleibt im Formular:
  - 401: „E-Mail oder Passwort stimmt nicht.“
  - 429: „Zu viele Versuche. Bitte warte eine Minute.“
  - Netzwerk/5xx: „Anmelden hat nicht geklappt. Bitte versuch es noch einmal.“

**Registrieren (`/register`)**
- Gleiche Karte, Überschrift „Konto anlegen“. Felder: „Name“ (`autocomplete=name`), „E-Mail“,
  „Passwort“ (`autocomplete=new-password`, Hinweis „Mindestens 8 Zeichen“).
- Clientseitige Prüfung vor dem Absenden: Name und E-Mail nicht leer, Passwort ≥ 8 Zeichen. Der
  Fehler steht am Feld (`aria-invalid` + Text, `aria-describedby`).
- Knopf „Konto anlegen“; Erfolg (201) meldet direkt an und führt zu `next` bzw. `/recipes`.
- Fehler: 409 am E-Mail-Feld „Diese E-Mail ist schon registriert.“ mit Link „Anmelden“; 422 die
  Backend-Meldung am Formular; 429 und Netzwerk wie beim Login.
- Link „Schon ein Konto? Anmelden“.

**Abmelden**
- Im `ProfileMenu` unter dem Theme-Untermenü: Trenner, dann „Abmelden“. Nur im REST-Modus.
- Sofort, ohne Rückfrage: `signOut`, dann `/login`. Andere Tabs folgen über das `storage`-Event.

## Tests (Architektur §7)

- `auth.ts`: Speichern/Lesen, `exp`-Prüfung, Single-flight (zwei parallele `getAccessToken` →
  ein `refresh`-Request), Lock-Pfad mit gemocktem `navigator.locks` (zweiter Tab liest den neuen
  Token aus `localStorage` statt selbst zu refreshen), 401 beim Refresh → Sitzung gelöscht +
  `expired`, `storage`-Event → Listener.
- `rest.ts`: Bearer aus der Sitzung; 401 → ein Refresh + ein Retry; zweiter 401 → `expired`, kein
  dritter Request; `/auth/*` ohne Retry; Binary- und Blob-Requests ebenso.
- Seiten: Login-Erfolg führt zu `next`; ungültiges `next` (`//evil`, `https://…`) → `/recipes`;
  Fehlertexte für 401/409/422/429; Register-Prüfung am Feld; Guard leitet ohne Sitzung um und
  lädt die Kataloge nicht.
- Mock-Modus: bestehende Tests laufen unverändert, kein Login nötig.

## Doku

- README „Backend connection“: Login gegen ein lokales Backend (Seed-Nutzer aus
  `cargo run --bin seed`, Passwort laut Backend-README), `CORS_ALLOWED_ORIGINS` für ein
  Cross-Origin-`VITE_API_URL`, Hinweis „Produktion nur über HTTPS“.
- `docs/architecture.md`: neuer Punkt in §1 (Sitzung nur über `src/api/auth.ts`) und §5 (Guard,
  `/login`, `/register`). Zieht der Docs-PR dieser Spec nach.
- `docs/plan.md`: Leitplanke „Kein Login“ wird beim Merge von A3 ersetzt.

## Review-Log

- 2026-11-08: Lead, aus Backend-PR #20 abgeleitet. Design-Review durch den Foodly Designer folgt.
