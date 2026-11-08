# Anmelden, Registrieren, Abmelden — Issue-Plan

> Vorbereitet auf Wunsch von Daniel (Karte, 2026-11-08). Die Abschnitte A1–A4 sind die Issue-Texte
> (Titel = Überschrift ohne „Ax —“).

Spec: `docs/superpowers/specs/2026-11-08-auth-login-design.md`. Backend-Vertrag:
`docs/backend-questions.md` B7.

Labels für alle: `alpha`, `backend-blocked`. Blockiert durch
[Backend-PR #20](https://github.com/klassenserver7b/Foodly-backend/pull/20). A1–A3 erst mergen,
wenn #20 auf `main` ist; bauen kann man sie vorher (gemocktes `fetch`). A4 braucht #20 auch zum
Testen von Hand.
Pflicht-Checks laut CLAUDE.md (lokal, ADR 0004).

## Reihenfolge und Abhängigkeiten

| # | Issue | Hängt ab von | Parallel möglich mit |
|---|---|---|---|
| A1 (#141) | Sitzung und Token-Refresh in `src/api` | – | A4 |
| A2 (#142) | Anmelden- und Registrieren-Seite mit Routen-Schutz | A1 | A4 |
| A3 (#143) | Abmelden und Ende der Sitzung | A2 | A4 |
| A4 (#144) | Rezeptbilder anzeigen | #140 (ImageRef) | A1–A3 |

A1–A3 gemeinsam nach dem Merge von #20 mergen, in der Reihenfolge A1 → A2 → A3. A1 allein
gemergt lässt die App gegen ein #20-Backend ohne Login-Seite stehen; deshalb A1 und A2 möglichst
direkt hintereinander.

---

## A1 — Sitzung und Token-Refresh in `src/api`

Labels: alpha, backend-blocked · Depends on: –

### Context
Spec Abschnitte „Architektur → Sitzung“ und „REST-Client“. Heute schickt `src/api/rest.ts` einen
statischen `DEV_TOKEN`; das Backend nimmt ab PR #20 nur noch echte JWTs an.

### Goal
`src/api` verwaltet eine echte Sitzung: Tokens in `localStorage["foodly.auth"]`, automatischer
Refresh (höchstens einer gleichzeitig, auch über Tabs), ein Retry bei 401. Ohne UI.

### Scope
- Neu `src/api/auth.ts`: Sitzung lesen/schreiben, `getAccessToken`, Single-flight-Refresh mit
  `navigator.locks` (Fallback ohne), `subscribe`, `storage`-Event, Ereignis `signed-out`
  (`expired` | `signed-out`).
- `foodly.auth.signIn / signUp / signOut / session / subscribe` in `src/api/index.ts`; Mock-Modus
  wie in der Spec (immer Nutzer 1).
- `src/api/rest.ts`: `DEV_TOKEN` entfernen; alle drei Request-Arten holen den Token; 401 → ein
  Refresh + ein Retry; `/auth/*` ohne Retry.
- Protokolltypen (`AuthResponse`, `TokenPair`) in `protocol.ts`.

### Acceptance criteria
- [ ] Zwei parallele Requests mit abgelaufenem Access-Token lösen genau einen `POST /auth/refresh`
      aus (Test).
- [ ] Mit gemocktem `navigator.locks`: Hat ein anderer Tab bereits refresht (neuer Token in
      `localStorage`), wird kein eigener Refresh geschickt (Test).
- [ ] 401 auf einer geschützten Route → Refresh → genau ein Retry; ein zweiter 401 löscht die
      Sitzung und meldet `expired`, ohne dritten Request (Test).
- [ ] `requestBinary` und `requestBlob` nutzen denselben Pfad (Test).
- [ ] `signOut` löscht die Sitzung auch bei fehlgeschlagenem `POST /auth/logout` und ruft
      `resetTagIconCache` und `setStubUser(null)` (Test).
- [ ] `grep -r DEV_TOKEN src` ist leer.
- [ ] Mock-Modus: alle bestehenden Tests grün ohne Anpassung an Login.
- [ ] Pflicht-Checks laut CLAUDE.md passen.

---

## A2 — Anmelden- und Registrieren-Seite mit Routen-Schutz

Labels: alpha, backend-blocked, ui · Depends on: A1

### Context
Spec Abschnitte „Routing und Guard“ und „Seiten“. Produktentscheidung: Registrierung ist offen
(Daniel, 2026-11-08).

### Goal
Ohne Sitzung landet man auf `/login`, kann sich anmelden oder ein Konto anlegen und kommt zurück
zur ursprünglichen Seite.

### Scope
- `src/pages/Login.tsx`, `src/pages/Register.tsx` nach Spec (Felder, Texte, Fehlermeldungen,
  Autocomplete-Attribute); nur postxl-Komponenten.
- `RequireAuth` (z. B. `src/components/shell/RequireAuth.tsx`) und Routen in `src/App.tsx`:
  `/login` und `/register` außerhalb von `AppShell`/`CatalogProvider`; alle anderen Routen
  geschützt; `CatalogProvider` mit `key={userId}`.
- `next`-Parameter: nur app-interne Pfade.

### Acceptance criteria
- [ ] Ohne Sitzung führt `/recipes/5` zu `/login?next=%2Frecipes%2F5`; nach dem Anmelden steht
      `/recipes/5` in der Adresse (Test).
- [ ] `next=//evil.example` und `next=https://evil.example` führen zu `/recipes` (Test).
- [ ] Ohne Sitzung startet kein Katalog-Request (`/users/me`, `/tags`, …) (Test).
- [ ] Login-Fehler: 401, 429 und Netzwerkfehler zeigen die Texte der Spec als `Alert`; bei 401
      bleibt die E-Mail, das Passwort ist leer und fokussiert (Test).
- [ ] Passwort-anzeigen-Knopf schaltet `type` zwischen `password` und `text`, mit passendem
      `aria-label` (Test).
- [ ] `<title>` ist „Anmelden · Foodly“ bzw. „Konto anlegen · Foodly“.
- [ ] Register: Passwort mit 7 Zeichen wird am Feld abgelehnt (Fehler ersetzt den Hilfetext),
      ohne Request; 409 zeigt den Hinweis am E-Mail-Feld mit Link `/login?email=…`; 201 meldet an
      und navigiert (Test).
- [ ] Angemeldet führt `/login` zu `/recipes`.
- [ ] Mock-Modus: `/login` leitet auf `/recipes`, keine Seite ist geschützt.
- [ ] Pflicht-Checks laut CLAUDE.md passen.

---

## A3 — Abmelden und Ende der Sitzung

Labels: alpha, backend-blocked, ui · Depends on: A2

### Context
Spec Abschnitte „Abmelden“ und „Routing und Guard“ (Sitzungsende während der Nutzung).

### Goal
Man kann sich abmelden; eine abgelaufene Sitzung oder ein Abmelden in einem anderen Tab führt
sauber zurück zur Anmeldung.

### Scope
- `ProfileMenu`: Trenner + „Abmelden“ (nur REST-Modus).
- Guard reagiert auf `signed-out`/`expired` und auf das `storage`-Event; Login-Seite zeigt bei
  `expired` den Hinweis der Spec.
- Doku: README-Abschnitt „Backend connection“ (Seed-Login, `CORS_ALLOWED_ORIGINS`, HTTPS),
  `docs/plan.md` Leitplanke „Kein Login“ ersetzen.

### Acceptance criteria
- [ ] „Abmelden“ schickt `POST /auth/logout` mit dem Refresh-Token, löscht die Sitzung und zeigt
      `/login` (Test).
- [ ] Ein `storage`-Event, das `foodly.auth` entfernt, führt in einem geöffneten Tab zu
      `/login?next=…` (Test).
- [ ] Refresh mit 401 → `/login` mit dem neutralen Hinweis „Deine Anmeldung ist abgelaufen …“ und
      vorausgefüllter E-Mail, falls bekannt (Test).
- [ ] Nach Abmelden und Anmelden als anderer Nutzer zeigt das Profilmenü den neuen Namen
      (`CatalogProvider` neu geladen) (Test).
- [ ] Mock-Modus: kein „Abmelden“ im Menü.
- [ ] Pflicht-Checks laut CLAUDE.md passen.

---

## A4 — Rezeptbilder anzeigen

Labels: alpha, backend-blocked · Depends on: #140

### Context
B1 ist mit Backend-PR #19 gelöst (`mainImage`/`images` als `{ id, hash, name }`). Mit PR #20 wird
`GET /images/{hash}` öffentlich, damit funktioniert `<img src>` ohne Bearer. Heute ist `images` im
REST-Modus gestubbt (`src/api/stubs.ts`, `src/api/assets.ts`, ADR 0003): Liste und Detail zeigen
kein Foto, der Editor einen Platzhalter.

### Goal
Im REST-Modus zeigen Liste (Detailliert, Kacheln), Detail (Hero + Galerie) und Editor
(`ImageManager`) die echten Bilder.

### Scope
- `recipeImageSrc(ref)` liefert im REST-Modus `apiUrl('/images/' + ref.hash)`; `images` aus der
  Stub-Liste nehmen; Demo-Hinweise zu Bildern entfernen.
- `alt` aus `ref.name`, sonst wie heute. Ladefehler (`onError`) zeigt den bestehenden Platzhalter.
- `docs/backend-questions.md` und `docs/plan.md` (Stub-Tabelle) nachziehen.

### Acceptance criteria
- [ ] REST-Modus: Ein Rezept mit `mainImage.hash = "ab…"` rendert `<img src="/api/v1/images/ab…">`
      in Zeile, Kachel und Detail (Test).
- [ ] Nach Upload im Editor erscheint das hochgeladene Bild sofort (Test).
- [ ] Ein Bild mit Ladefehler zeigt den Platzhalter statt eines kaputten Bilds (Test).
- [ ] `isStubbed('images')` ist im REST-Modus `false`; kein „Demo“-Hinweis mehr an Bildern.
- [ ] Mock-Modus unverändert.
- [ ] Pflicht-Checks laut CLAUDE.md passen.
