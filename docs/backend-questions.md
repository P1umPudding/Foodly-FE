# Offene Backend-/Protokollfragen

Lebende Liste aller Fragen an den Backend-Vertrag (`klassenserver7b/Foodly-backend`,
Branch `main`, `resources/md/02_API_Design.md` + `03_Data_Models.md`), je mit
Vorschlag und Status. Gepflegt vom Lead.

Abgeglichen am **2026-11-12** gegen `main` @ `4cbbb55` (PR #20 gemergt als `097b69d`) und den offenen
PR #22 @ `b39c380` (Review unten, „Review Backend-PR #22“),
Doku **und** Code unter `src/api/rest/`. `web-api` ist
seit PR #18 (2026-11-04) in `main` gemergt; `main` ist der Default-Branch, neue
Backend-PRs gehen gegen `main`.

**Status:** `gelöst` (im Backend vorhanden) · `FE-Arbeit` (Backend fertig, Frontend
muss nachziehen) · `offen` (Backend fehlt/unklar) · `Entscheidung` (Produktfrage für
Kolja) · `später` (nicht blockierend).
**Blockiert FE?** = ob eine konkrete Frontend-Arbeit ohne Antwort nicht fertig wird.

## Überblick

| #   | Thema                                   | Status      | Blockiert FE?           | Backend-Issue |
| --- | --------------------------------------- | ----------- | ----------------------- | ------------- |
| B1  | Bild-URL: `ImageId` → Datei             | gelöst      | –                       | [#9](https://github.com/klassenserver7b/Foodly-backend/issues/9) |
| B2  | User-Lookup für Namen (owner/editors)   | PR #22 offen | ja (FE U2)             | [#10](https://github.com/klassenserver7b/Foodly-backend/issues/10) |
| B3  | Ratings-Endpoints fehlen im Code        | offen       | ja (Phase 4 Rating)     | [#11](https://github.com/klassenserver7b/Foodly-backend/issues/11) |
| B4  | Sharing-Endpoints fehlen im Code        | offen       | ja (Phase 4 Teilen)     | [#12](https://github.com/klassenserver7b/Foodly-backend/issues/12) |
| B5  | Groups-Endpoints fehlen im Code         | offen       | ja (Phase 5 M2)         | [#13](https://github.com/klassenserver7b/Foodly-backend/issues/13) |
| B6  | „added-at" pro viewer/editor + Feed     | PR #22 offen | ja (FE D3)             | [#14](https://github.com/klassenserver7b/Foodly-backend/issues/14) |
| B7  | Echte Auth + CORS `Authorization`       | FE-Arbeit   | ja (REST-Modus braucht Login) | [#15](https://github.com/klassenserver7b/Foodly-backend/issues/15) |
| B8  | Tags anlegen (Katalog read-only)        | Entscheidung | nein                   | –             |
| B9  | `tagId = name`                          | später      | nein                    | –             |
| B10 | Schritt-Timer (`Step.duration`)         | später      | nein                    | –             |
| B11 | `UserCategory.icon`                     | später      | nein                    | –             |
| B12 | Gruppen ↔ Rezepte-Modell                | Entscheidung | nein                   | –             |
| B13 | Verwaiste Bilder (GC)                   | später      | nein                    | –             |
| B14 | Doku-Drift (Status-Codes, Pagination)   | später      | nein                    | –             |
| B15 | Sortierung nach `created_at`/`updated_at` | offen     | nein (Workaround FE)    | [#16](https://github.com/klassenserver7b/Foodly-backend/issues/16) |
| B16 | Trefferzahlen/Facetten in der Suche      | offen       | nein (FE ohne Zahlen)   | [#17](https://github.com/klassenserver7b/Foodly-backend/issues/17) |
| G1  | `createdAt` / `updatedAt` an Recipe     | FE-Arbeit   | –                       | –             |
| G2  | `UserRating` DB-only                    | gelöst      | –                       | –             |
| G3  | Tag-Icons (`GET /tags/{id}/icon`)       | gelöst      | –                       | –             |
| G4  | Kategorien-Liste                        | gelöst      | –                       | –             |
| G5  | Sortfeld-Namen                          | gelöst      | –                       | –             |

Backend-Issues B1–B7 am 2026-10-27 angelegt (#9–#15, englisch, Text wie die
Abschnitte unten). Duplikat-Check vorher: keine Issues im Repo, nur PRs #1–#8.

---

## Offen und blockierend

### B1 — Bild-URL: `ImageId` → Datei

**Gelöst im Backend** durch PR #19 (gemergt 2026-11-05, schließt #9), so wie in
Vorschlag A: `Recipe.mainImage: { id, hash, name } | null`, `Recipe.images: { id,
hash, name }[]`, `RecipePreview.mainImage` ebenso. Im Write-Body bleiben es IDs.

**Gelöst im FE** durch #140: `protocol.ts` liest `ImageRef = { id, hash, name }`,
der Draft hält Refs, `toCreateRecipe` schickt nur IDs. Die Mocks expandieren die
IDs aus `recipes.json` zu Refs. Echte Bildanzeige im REST-Modus per
`<img src=/images/{hash}>` (die Route ist seit Backend-PR #20 öffentlich) ist
umgesetzt in FE #144; Profilbilder laufen über dieselbe Route.

### B2 — User-Lookup für Namen

**Problem.** Das Frontend löst `owner`/`editors`/`viewers` und `rating[].user` über
eine `byId`-Map auf (`CatalogProvider`). Das Backend hat nur `GET /users/me` und
`GET /users/search?q=` (Typeahead, schließt einen selbst aus) — kein Bulk-Lookup.
`listUsers` bleibt daher gemockt; im REST-Modus fehlen Namen.

**Vorschlag:** `GET /api/v1/users?ids=2,3,5` → `{ data: [{ id, name, profilePicture }] }`
(nur kompakte Felder, nur User, mit denen man ein Rezept/eine Gruppe teilt).
Alternativ Recipe expandiert `owner/editors/viewers` als `{ id, name }` — mehr Payload,
weniger Requests; A ist flexibler.

**Entsperrt:** `listUsers`-Mock entfernen; Rollen-/Rating-Anzeige mit echten Namen.

**Stand 2026-11-12:** Umgesetzt in Backend-PR #22 (offen) wie vorgeschlagen, aber **ohne** Beschränkung auf
Nutzer, mit denen man teilt (Review-Hinweis 2 unten). FE-Issue U2 (`superpowers/plans/2026-11-12-backend-22-followups.md`),
`backend-blocked` bis zum Merge.

### B3 — Ratings-Endpoints

**Problem.** `PUT|DELETE /recipes/{id}/ratings/me` sind dokumentiert, aber nicht
geroutet; `rating` kommt immer leer zurück.

**Vorschlag:** wie dokumentiert umsetzen und `rating[]` in Preview + Detail füllen.

**Entsperrt:** Phase 4 „Rating abgeben"; Rating-Anzeige/-Sortierung im REST-Modus.

**Sortierung nach Bewertung (FE #49), Stand 2026-11-12.** Backend-`main` sortiert schon
serverseitig (`sort.field = "rating"`, `COALESCE(AVG(rating), 0.0)`); es fehlen nur Daten
(#11). Zwei Feinheiten passen nicht: Unbewertete zählen als 0 und stehen bei `asc` vorne,
und ohne Tie-Breaker (`recipes.id ASC`) können Rezepte beim Blättern doppelt erscheinen oder
fehlen. Vorschlag: Durchschnitt über alle Nutzer, Unbewertete in beiden Richtungen zuletzt,
immer `id ASC` als Tie-Breaker (für alle Sortierfelder). Von Kolja am 2026-11-12 als
Kommentar auf [#11](https://github.com/klassenserver7b/Foodly-backend/issues/11)
freigegeben. **Noch nicht gepostet:** Der Skaile-Bot darf im Backend-Repo nicht
kommentieren („Resource not accessible by integration“). Bitte Kolja oder Daniel posten.

<details><summary>Kommentar-Entwurf für Backend #11</summary>

````markdown
**Recipe search: sort by rating — unrated last and stable tie-breaker (follow-up to #11)**

**Context.** The frontend lists recipes via `POST /api/v1/recipes/search` with infinite scroll (offset pages, `limit=100`, following `cursor`). Users can sort by rating. Today `rating[]` is always empty (#11 not routed yet), so the frontend keeps ratings in a local stub and re-sorts each page on its own. Rated recipes from page 2 therefore show up after the unrated ones from page 1 (frontend issue P1umPudding/Foodly-FE#49). Once #11 lands, sorting must happen entirely on the server, across all pages.

`main` already has a `rating` sort arm (`src/api/rest/recipes/mod.rs`, `COALESCE(AVG(rating), 0.0)`). Two details would break the list for us:
1. Unrated recipes count as `0.0`, so with `order: "asc"` they come before all rated ones.
2. There is no tie-breaker after the sort field. Many recipes share the same average (and all unrated ones are tied), so with offset paging recipes can repeat or be skipped between pages.

**Proposed behavior** (no new parameters):
- Request: `"sort": { "field": "rating", "order": "desc" | "asc" }`, combinable with all `filters` and with `page`/`limit` as today.
- Sort key: average of all users' ratings for the recipe (`AVG(user_ratings.rating)`, 1–5), the same value the frontend shows as the average from `rating[]`.
- Recipes without any rating come **last in both directions** (`AVG` without `COALESCE`, `NULLS LAST`).
- Tie-breaker: always append `recipes.id ASC` after the sort field, so the order is total and stable across pages. Ideally do this for every sort field (`name`, `workTime`, `totalTime`, `accessSince`), not only `rating`.
- The recipe's position must not depend on the requesting user's own rating. It is the overall average, consistent with the `rating[]` data.

**Acceptance criteria:**
- [ ] With ratings on recipes spread across more than one page (e.g. 150 recipes, `limit=100`), `desc` returns all rated recipes ordered by average (highest first) before any unrated ones, across page 1 and page 2. (Integration test can insert `user_ratings` directly if #11 is not merged yet.)
- [ ] `asc` returns rated recipes lowest average first, unrated ones still last.
- [ ] Recipes with equal averages (and all unrated ones) are ordered by `id ASC`. Concatenating all pages yields every matching recipe exactly once.
- [ ] Combining `rating` sort with filters (e.g. `categories`, `maxWorkTime`) keeps the same rules.
- [ ] `02_API_Design.md` documents the rating sort semantics (average, unrated last, `id` tie-breaker).

**Unblocks (frontend):** P1umPudding/Foodly-FE#49. Together with #11 the frontend drops its per-page re-sort and its local rating stub.

---
_Filed by the Foodly frontend lead (P1umPudding/Foodly-FE). Context: `docs/backend-questions.md` (B3) in the frontend repo. Happy to adjust, it is a suggestion, not a requirement._
````

</details>

### B4 — Sharing-Endpoints

**Problem.** `PUT /recipes/{id}/editors|viewers` dokumentiert, nicht geroutet.

**Vorschlag:** wie dokumentiert umsetzen. Dazu: Soll ein User gleichzeitig in
`editors` und `viewers` stehen dürfen? Vorschlag: nein, Server verschiebt (setzt man
jemanden als Editor, fliegt er aus `viewers`) oder antwortet 422.

**Entsperrt:** Phase 4 „Teilen"-Dialog (inkl. Gruppen-Vorauswahl).

### B5 — Groups-Endpoints

**Problem.** `GET|POST /groups`, `PUT|DELETE /groups/{id}` dokumentiert, nicht
geroutet (Migration `011_create_groups.sql` existiert).

**Vorschlag:** wie dokumentiert umsetzen.

**Entsperrt:** Phase 5 Gruppen-Seiten und Dashboard-Kachel gegen echte Daten (M1
läuft vorerst auf Mocks).

### B6 — „added-at" pro viewer/editor + Activity-Feed

**Problem.** `recipe_editors` / `recipe_viewers` haben keine Zeitspalte. Die
Phase-5-Kachel „Kürzlich mit dir geteilt" braucht, *wann* man hinzugefügt wurde.
Der Activity-/Notification-Feed ist im Backend als „DB schema TBD" offen.

**Vorschlag (zweistufig):**
1. Sofort, klein: `added_at TIMESTAMPTZ NOT NULL DEFAULT now()` in beiden Tabellen;
   im Recipe nur für den aktuellen User ausliefern: `myAccessSince: string | null`
   (bei owner = `createdAt`). Optional `sort.field = "access_since"` in
   `/recipes/search`. Das reicht für die Kachel.
2. Später: `GET /api/v1/activity?page=` mit Einträgen
   `{ id, type: "recipe.shared" | "group.added" | …, actor, recipe?, group?, at, read }`.
   Nicht nötig für Phase 5, gemeinsam modellieren, wenn Notifications dran sind.

**Stand 2026-11-12:** Stufe 1 in Backend-PR #22 (offen): `added_at` in beiden Tabellen, `myAccessSince` an Preview
und Detail (Owner = `createdAt`, Editor vor Viewer), `sort.field = "accessSince"` (camelCase, nicht `access_since`).
Nebeneffekt: `accessRights:[owner]` + `accessSince desc` = „zuletzt erstellt“ serverseitig (FE D3). Die Kachel
„Kürzlich mit dir geteilt“ wird erst mit Teilen (B4, #12) geschnitten (Daniel, 2026-11-12): Ohne Teilen-Endpunkte
wird niemand Editor/Viewer.

**Entsperrt:** Phase 5 Milestone 2 (Recency-Kachel „hinzugefügt").

### B7 — Echte Auth + CORS

**Problem.** `auth_middleware` (`src/lib.rs`) akzeptiert jeden Bearer als User 1;
`/auth/*` ist nicht geroutet. CORS erlaubt Header per `*`, was `Authorization` laut
Fetch-Standard **nicht** abdeckt — direkte Cross-Origin-Requests scheitern am
Preflight (das FE umgeht das in Dev mit dem Vite-Proxy).

**Vorschlag:** `/auth/register|login|refresh` wie dokumentiert; CORS mit expliziter
`allow_headers([AUTHORIZATION, CONTENT_TYPE])` und konfigurierbarer Origin-Liste —
oder bewusst „nur same-origin hinter Reverse-Proxy" festlegen und dokumentieren.

**Entsperrt:** Login-Seite/Token-Handling im FE, echter Multi-User-Betrieb,
Prod-Deployment.

**Stand 2026-11-09: PR #20 gemergt** (`097b69d`). Vertrag auf `main` erneut geprüft,
unverändert gegenüber dem Stand vom 08.11.:
- `POST /auth/register` (201), `/auth/login`, `/auth/refresh` (Rotation, alter Token
  danach 401), `/auth/logout` (Body `refreshToken`, 204), `DELETE /auth/sessions`.
  Antwort `{ user, accessToken, refreshToken }` bzw. `{ accessToken, refreshToken }`,
  **kein** `expiresIn`: Ablauf steht im JWT (`exp`, Standard 15 Min.), Refresh 30 Tage.
- Fehler im Envelope `{ error: { code, message } }`: 401 `UNAUTHORIZED`, 409 bei
  doppelter E-Mail, 422 bei Passwort < 8 Zeichen, 429 `TOO_MANY_REQUESTS`.
- Rate-Limit: register/login/refresh teilen einen Topf pro IP (5/Min., Burst 5);
  Uploads 1/Min., Burst 10.
- CORS: explizit `Authorization` + `Content-Type`, Origins aus `CORS_ALLOWED_ORIGINS`
  (Standard `http://localhost:5173`).
- `GET /images/{hash}` öffentlich; `POST`/`DELETE /images` mit Owner.
  `GET /tags/{id}/icon` bleibt geschützt (G3-Lösung bleibt).
- Nicht enthalten: Passwort ändern/zurücksetzen, Konto löschen, E-Mail-Bestätigung.
- `POST /auth/logout` braucht einen gültigen Access-Token (Bearer) und löscht nur
  Refresh-Tokens des eigenen Nutzers.
- Seed: `cargo run --bin seed` legt `user1@example.com`, `user2@…`, `user3@…` an,
  Passwort `password123`.

**Review-Befunde vom 08.11.** — alle vor dem Merge behoben (`dd1ffa0`, `6d3b21f`,
`28d9b07`): Re-Upload behält den Owner, referenzierte Bilder werden beim Löschen
behalten, Konfig-Tabelle ergänzt. Der Review-Entwurf ist damit hinfällig und entfernt.

**FE jetzt (#141–#143, #146):** Login (+ ggf. Register), Token-Speicher, genau ein Refresh
gleichzeitig (auch über Tabs, wegen Rotation und Rate-Limit), 401 → Login, geschützte
Routen, `DEV_TOKEN` aus `src/api/rest.ts` entfernen. Entschieden (Daniel, 2026-11-08):
offene Registrierung, Tokens in `localStorage`. Spec:
`superpowers/specs/2026-11-08-auth-login-design.md`.

### Review Backend-PR #22 (2026-11-12, Lead)

PR [#22](https://github.com/klassenserver7b/Foodly-backend/pull/22) „bulk user lookup and access-since tracking“
@ `b39c380`, 28 Dateien. Geprüft gegen den FE-Code auf `main`. Folgen fürs FE:
`superpowers/plans/2026-11-12-backend-22-followups.md` (U1, U2) und Phase-5-Plan (D3).

1. **Sortierfelder (bricht das FE bis U1):** Unbekannte `sort.field` → 422 statt Fallback auf `id`; `worktime`/
   `totaltime` sind keine Aliase mehr. FE sendet sie heute. → U1 direkt nach dem Merge.
2. **Datenschutz `GET /users?ids=`:** Jeder angemeldete Nutzer kann beliebige IDs (bis 100 pro Request, beliebig oft)
   zu Name und Profilbild auflösen und so alle Nutzer durchzählen. Für die Alpha unkritisch, vor einem öffentlichen
   Betrieb aber zu klären.
3. **`myAccessSince` / `accessSince`:** passt zu B6 und zum FE-Bedarf. Tie-Breaker `id` ist jetzt immer gesetzt.
4. **Doku:** Filter-Arrays sind UND (B16), Statuscodes 201 → 200 (B14 erledigt), Zeitstempel als `+00:00`, `page`
   max. 10.000, Kategorie-Rezepte max. 500, `reorder` max. 100, Filter-Arrays max. 100 bzw. 10 (alles 422). Für das
   FE ohne Arbeit; die IDs sind jetzt i64, für JS-Zahlen unkritisch.

**Kommentar zum Posten** (der Lead kann im Backend-Repo nicht kommentieren; bitte von Kolja oder Daniel als
PR-Kommentar ablegen):

> Danke für den PR, das deckt B2 und B6 genau so ab, wie das Frontend es braucht. Zwei Hinweise aus Frontend-Sicht:
>
> 1. **Sortierfelder:** Mit dem PR antwortet `sort.field: "worktime"` / `"totaltime"` mit 422. Das Frontend schickt
>    heute genau diese Schreibweise und stellt direkt nach dem Merge auf `workTime` / `totalTime` um (FE-Issue
>    verlinkt). Falls ihr das Fenster dazwischen vermeiden wollt, könnten `worktime` / `totaltime` noch eine Weile als
>    Alias bleiben; sonst passt es so, wir mergen zeitnah nach.
> 2. **`GET /users?ids=` und Privatsphäre:** Aktuell kann jeder angemeldete Nutzer beliebige IDs zu Name und
>    Profilbild auflösen und damit alle Nutzer durchzählen. Für die Alpha ist das kein Problem. Vorschlag für später:
>    nur Nutzer zurückgeben, mit denen man ein Rezept (oder später eine Gruppe) teilt, plus sich selbst. Unbekannte bzw.
>    nicht sichtbare IDs fehlen ja schon jetzt einfach in der Antwort, das Frontend käme damit ohne Änderung klar.
>
> Kleinigkeit: Laut Doku sind die Filter-Arrays strikt UND. Damit ist die Teilfrage aus #17 beantwortet, das Frontend
> filtert Kategorien (ODER) weiter selbst.

---

## Entscheidungen (Kolja)

### B8 — Tags anlegen

Der Tag-Katalog ist read-only (kein `POST /tags`); ein unbekannter Tag im Rezept → 422.
Der Editor kann nur vorhandene Tags wählen.
**Optionen:** (a) kuratiert lassen (Admin pflegt), (b) User dürfen Tags anlegen
(`POST /tags { id }`, global), (c) private Tags pro User.
**Empfehlung:** (a) bis Tags editierbar werden müssen; sonst zuerst B9 lösen.

### B12 — Gruppen ↔ Rezepte

Gruppen sind nur Vorauswahl beim Teilen; später hinzugefügte Mitglieder sehen
alte Rezepte nicht. Phase 5 leitet „Rezepte der Gruppe" als „mit **allen**
Mitgliedern geteilt" ab.
**Optionen:** (a) so lassen (dokumentierter Trade-off), (b) echte Gruppenfreigabe
(`recipe_groups`-Tabelle, Zugriff = direkt ODER über Gruppe).
**Empfehlung:** (a) für Phase 4/5; (b) erst, wenn Nutzer es vermissen — kostet
Backend-Umbau der Zugriffsabfrage.

---

## Später / nicht blockierend

- **B16 Trefferzahlen:** Die Suche ist paginiert, deshalb kann das FE Zahlen pro
  Tag/Zutat/Kategorie und „N Rezepte anzeigen“ nicht korrekt zählen. Runde 1 der
  Filterleiste zeigt keine Zahlen. Vorschlag: opt-in `facets` im Request,
  `total` + `facets` in der Antwort; `total` allein wäre der erste Schritt. Im Issue
  außerdem gefragt: Ist `categories` im Filter UND (Doku) oder ODER (FE heute)?
  **Teilantwort (Doku in PR #22):** alle Filter-Arrays sind serverseitig strikt UND. Der Kategorie-Filter des FE
  (ODER) bleibt deshalb clientseitig. Zahlen/Facetten weiter offen.
  → [#17](https://github.com/klassenserver7b/Foodly-backend/issues/17)
- **B15 Sortierung nach Timestamps:** `POST /recipes/search` sortiert nur nach
  name/worktime/totaltime/rating, alles andere fällt auf `id ASC` zurück. Phase-5-Kachel
  „Your recent creations" sortiert bis dahin clientseitig hinter einem Helper
  (`recentCreations`). Vorschlag: `created_at` / `updated_at` als Sortfelder, plus
  `id` als Tie-Breaker. → [#16](https://github.com/klassenserver7b/Foodly-backend/issues/16)
- **B9 `tagId = name`:** Umbenennen bricht Referenzen. Erst relevant, wenn Tags
  editierbar werden (dann stabile `id` + `label`). Backend dokumentiert das schon.
- **B10 Schritt-Timer:** Doku `03_Data_Models` beschreibt `Step { id, text }`, API
  und Code liefern `steps: string[]`. Vorschlag: bei Bedarf als
  `steps: { text, durationSeconds: number | null }[]` umstellen (FE-Adapter fängt
  den Wechsel ab). Bis dahin Doku angleichen.
- **B11 `UserCategory.icon`:** optionales `icon: TagId | null`. Nice-to-have.
- **B13 Verwaiste/geteilte Bilder:** hochgeladen, nie gespeichert → bleiben liegen.
  Vorschlag: periodischer GC für Bilder ohne Referenz älter als 24 h. Der geteilte
  Teil ist mit PR #20 gelöst (Löschen behält referenzierte Bilder). Hinweis Uploads:
  Rate-Limit 1/Min. nach Burst 10 pro IP.
- **B14 Doku-Drift:** `POST /recipes` antwortet 200 statt dokumentiert 201;
  `GET /categories` ist paginiert, Doku zeigt flaches `{ data }`; `/tags`
  liefert `{ data }`, Doku-Konvention sagt „flat array". Nur Doku angleichen.

## Gelöst / Frontend muss nachziehen

- **G1 Timestamps:** `createdAt`/`updatedAt` liefert das Backend an Preview und
  Detail (`updatedAt` nur bei Inhaltsänderungen). **FE:** `protocol.ts` ergänzen,
  Phase-5-Kachel „Eigene zuletzt erstellt" auf `createdAt` umstellen (M2-Teil 1,
  nicht blockiert). **Stand 2026-11-12:** Typen kommen mit D3 (zusammen mit `myAccessSince`).
- **G2 `UserRating` DB-only:** Backend sagt explizit „never exposed". FE hat den Typ
  bereits auskommentiert — erledigt.
- **G3 Tag-Icons:** `GET /tags/{id}/icon` existiert. **FE (gelöst, #38):** Die Route
  liegt hinter der Bearer-Prüfung (`auth_middleware`) und antwortet ohne
  `Authorization` mit 401; `<img>` sendet keinen Header. Darum lädt `src/api/assets.ts`
  das Icon über `rest.getBlob` und zeigt eine gecachte Object-URL. Ohne Icon oder bei
  einem Ladefehler steht der Tag-Name.
- **G4 Kategorien:** `GET /categories` existiert (paginiert); FE nutzt es seit
  `feat/rest-backend-wiring`. Kategorie-Filter kann jetzt serverseitig laufen.
- **G5 Sortfelder:** Auf `main` akzeptiert das Backend `worktime|work_time` und
  `totaltime|total_time`; FE sendet `worktime`/`totaltime`. **Mit PR #22** gilt camelCase: nur noch
  `workTime|work_time`, `totalTime|total_time` (+ `accessSince`), alles andere 422. FE-Issue U1 stellt um und geht
  direkt nach dem Merge von #22 rein (Daniel, 2026-11-12).

---

## Backend-Issues

Angelegt 2026-10-27 in `klassenserver7b/Foodly-backend`:

- B1 → [#9](https://github.com/klassenserver7b/Foodly-backend/issues/9)
- B2 → [#10](https://github.com/klassenserver7b/Foodly-backend/issues/10)
- B3 → [#11](https://github.com/klassenserver7b/Foodly-backend/issues/11)
- B4 → [#12](https://github.com/klassenserver7b/Foodly-backend/issues/12)
- B5 → [#13](https://github.com/klassenserver7b/Foodly-backend/issues/13)
- B6 → [#14](https://github.com/klassenserver7b/Foodly-backend/issues/14)
- B7 → [#15](https://github.com/klassenserver7b/Foodly-backend/issues/15)

Angelegt 2026-10-28:

- B15 → [#16](https://github.com/klassenserver7b/Foodly-backend/issues/16)

Angelegt 2026-10-29:

- B16 → [#17](https://github.com/klassenserver7b/Foodly-backend/issues/17)
