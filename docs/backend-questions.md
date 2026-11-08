# Offene Backend-/Protokollfragen

Lebende Liste aller Fragen an den Backend-Vertrag (`klassenserver7b/Foodly-backend`,
Branch `main`, `resources/md/02_API_Design.md` + `03_Data_Models.md`), je mit
Vorschlag und Status. Gepflegt vom Lead.

Abgeglichen am **2026-11-08** gegen `main` @ `a299c9d` und die offene PR #20
(`auth-flow` @ `d901f0a`), Doku **und** Code unter `src/api/rest/`. `web-api` ist
seit PR #18 (2026-11-04) in `main` gemergt; `main` ist der Default-Branch, neue
Backend-PRs gehen gegen `main`.

**Status:** `gelöst` (im Backend vorhanden) · `FE-Arbeit` (Backend fertig, Frontend
muss nachziehen) · `offen` (Backend fehlt/unklar) · `Entscheidung` (Produktfrage für
Kolja) · `später` (nicht blockierend).
**Blockiert FE?** = ob eine konkrete Frontend-Arbeit ohne Antwort nicht fertig wird.

## Überblick

| #   | Thema                                   | Status      | Blockiert FE?           | Backend-Issue |
| --- | --------------------------------------- | ----------- | ----------------------- | ------------- |
| B1  | Bild-URL: `ImageId` → Datei             | FE-Arbeit   | ja (Speichern mit Bild) | [#9](https://github.com/klassenserver7b/Foodly-backend/issues/9) |
| B2  | User-Lookup für Namen (owner/editors)   | offen       | ja (REST-only-Betrieb)  | [#10](https://github.com/klassenserver7b/Foodly-backend/issues/10) |
| B3  | Ratings-Endpoints fehlen im Code        | offen       | ja (Phase 4 Rating)     | [#11](https://github.com/klassenserver7b/Foodly-backend/issues/11) |
| B4  | Sharing-Endpoints fehlen im Code        | offen       | ja (Phase 4 Teilen)     | [#12](https://github.com/klassenserver7b/Foodly-backend/issues/12) |
| B5  | Groups-Endpoints fehlen im Code         | offen       | ja (Phase 5 M2)         | [#13](https://github.com/klassenserver7b/Foodly-backend/issues/13) |
| B6  | „added-at" pro viewer/editor + Feed     | offen       | ja (Phase 5 M2)         | [#14](https://github.com/klassenserver7b/Foodly-backend/issues/14) |
| B7  | Echte Auth + CORS `Authorization`       | in Arbeit (PR #20) | ja (Prod, Multi-User) | [#15](https://github.com/klassenserver7b/Foodly-backend/issues/15) |
| B8  | Tags anlegen (Katalog read-only)        | Entscheidung | nein                   | –             |
| B9  | `tagId = name`                          | später      | nein                    | –             |
| B10 | Schritt-Timer (`Step.duration`)         | später      | nein                    | –             |
| B11 | `UserCategory.icon`                     | später      | nein                    | –             |
| B12 | Gruppen ↔ Rezepte-Modell                | Entscheidung | nein                   | –             |
| B13 | Verwaiste/geteilte Bilder               | später      | nein                    | Review PR #20 |
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

**FE-Arbeit (dringend):** `protocol.ts` typisiert beides noch als `ImageId`.
`src/editor/draft.ts` übernimmt `recipe.mainImage`/`images` in den Draft und
schickt sie beim Speichern zurück, gegen `main` also Objekte statt IDs. Ein
Rezept mit Bild lässt sich dann vermutlich nicht mehr speichern. Fix: Lese-Typ
`ImageRef`, Mapping auf IDs im Write-Body. Bilder anzeigen per `<img src>` geht
erst mit PR #20, weil `GET /images/{hash}` dort öffentlich wird; davor braucht es
den Bearer (Blob-Loader wie bei G3).

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

### B3 — Ratings-Endpoints

**Problem.** `PUT|DELETE /recipes/{id}/ratings/me` sind dokumentiert, aber nicht
geroutet; `rating` kommt immer leer zurück.

**Vorschlag:** wie dokumentiert umsetzen und `rating[]` in Preview + Detail füllen.

**Entsperrt:** Phase 4 „Rating abgeben"; Rating-Anzeige/-Sortierung im REST-Modus.

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

**Stand 2026-11-08: PR #20 offen** (`auth-flow` → `main`, schließt #15). Geprüft
gegen Code und Doku:
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

**Review-Befunde** (Entwurf unten in „Review-Entwurf PR #20“; der Bot darf im
Backend-Repo nicht kommentieren, Posten über Kolja/Daniel):
1. Re-Upload identischer Bytes setzt `owner_id` auf den neuen Uploader; der kann das
   Bild dann löschen, und per `ON DELETE SET NULL/CASCADE` verschwindet es aus fremden
   Rezepten. Doku sagt „existing row is returned“.
2. Bild- und Profilbild-Löschung entfernen die (geteilte, content-addressed) Datei
   ohne Referenzprüfung (hängt mit B13 zusammen).
3. Doku: `JWT_SECRET` als Pflicht markiert, wird aber erzeugt; `PASSWORD_PEPPER`,
   `REFRESH_TOKEN_EXPIRY_DAYS` fehlen in der Tabelle.

**FE nach dem Merge:** Login (+ ggf. Register), Token-Speicher, genau ein Refresh
gleichzeitig (auch über Tabs, wegen Rotation und Rate-Limit), 401 → Login, geschützte
Routen, `DEV_TOKEN` aus `src/api/rest.ts` entfernen. Entschieden (Daniel, 2026-11-08):
offene Registrierung, Tokens in `localStorage`. Spec:
`superpowers/specs/2026-11-08-auth-login-design.md`.

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
  Vorschlag: periodischer GC für Bilder ohne Referenz älter als 24 h. Seit PR #20
  dazu: Dateien sind content-addressed und damit geteilt, Löschen sollte nur
  unreferenzierte Dateien entfernen (Review PR #20, Punkt 2).
- **B14 Doku-Drift:** `POST /recipes` antwortet 200 statt dokumentiert 201;
  `GET /categories` ist paginiert, Doku zeigt flaches `{ data }`; `/tags`
  liefert `{ data }`, Doku-Konvention sagt „flat array". Nur Doku angleichen.

## Gelöst / Frontend muss nachziehen

- **G1 Timestamps:** `createdAt`/`updatedAt` liefert das Backend an Preview und
  Detail (`updatedAt` nur bei Inhaltsänderungen). **FE:** `protocol.ts` ergänzen,
  Phase-5-Kachel „Eigene zuletzt erstellt" auf `createdAt` umstellen (M2-Teil 1,
  nicht blockiert).
- **G2 `UserRating` DB-only:** Backend sagt explizit „never exposed". FE hat den Typ
  bereits auskommentiert — erledigt.
- **G3 Tag-Icons:** `GET /tags/{id}/icon` existiert. **FE (gelöst, #38):** Die Route
  liegt hinter der Bearer-Prüfung (`auth_middleware`) und antwortet ohne
  `Authorization` mit 401; `<img>` sendet keinen Header. Darum lädt `src/api/assets.ts`
  das Icon über `rest.getBlob` und zeigt eine gecachte Object-URL. Ohne Icon oder bei
  einem Ladefehler steht der Tag-Name.
- **G4 Kategorien:** `GET /categories` existiert (paginiert); FE nutzt es seit
  `feat/rest-backend-wiring`. Kategorie-Filter kann jetzt serverseitig laufen.
- **G5 Sortfelder:** Backend akzeptiert `worktime|work_time` und
  `totaltime|total_time`; FE sendet `worktime`/`totaltime`. Passt.

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

---

## Review-Entwurf PR #20

Am 2026-11-08 nicht gepostet: Der Skaile-Bot hat im Backend-Repo kein Kommentarrecht
(„Resource not accessible by integration“). Bitte als Kommentar auf
[PR #20](https://github.com/klassenserver7b/Foodly-backend/pull/20) einfügen.

````markdown
Thanks for this, great work! The auth flow matches what we proposed in #15. The response shapes match `02_API_Design.md`, and CORS with explicit `Authorization` plus the origin list unblocks the frontend login. Public `GET /images/:hash` is also very welcome, because the frontend can now use `<img src>` directly.

I'm the Foodly frontend lead. While going through the PR, I noticed a few points around images that you may want to look at before merging. These are suggestions, not demands:

**1. Re-upload transfers ownership** (`src/api/rest/images.rs`, `upload_image`)
`on_conflict(images::hash).do_update().set((…, images::owner_id.eq(user_id)))` makes the most recent uploader of identical bytes the owner. The doc says instead: "Re-uploading identical bytes is idempotent … the existing row is returned".
Because of `ON DELETE SET NULL` (`recipes.main_image_id`) and `ON DELETE CASCADE` (`recipe_images.image_id`), user B can re-upload A's photo, become its owner, and then `DELETE` it. That strips the image from A's recipes, and A can no longer delete their own upload.
Suggestion: on conflict, keep the existing `owner_id`. Something like `.set(images::hash.eq(&hash))`, or `do_nothing()` followed by a select.

**2. Image delete ignores other references** (`delete_image`, and `update_profile_picture` / `delete_profile_picture` in `users.rs`)
Files are content-addressed and therefore shared. Deleting the file removes it for every recipe or profile that uses the same hash. Two cases:
- A profile-picture change deletes the old file even if the same bytes are a recipe image.
- An image delete cascades out of other users' recipes.
One option is to refuse or skip the delete while the image is still referenced. Another is to delete only the caller's reference and garbage-collect unreferenced files later. This is related to orphaned images (B13 in our notes), so it doesn't have to block this PR. Point 1 would be good to fix first.

**3. Small doc nits** (`02_API_Design.md`, configuration table)
- `JWT_SECRET` is marked *(required)*, but `bootstrap_secrets()` generates it on first run.
- `PASSWORD_PEPPER` is missing from the table.
- `REFRESH_TOKEN_EXPIRY_DAYS` (read by `refresh_token_expiry_days()`, default 30) could be listed too.
- The PR body says "panic on unset pepper", but it is generated instead.

**4. FYI, no change needed**
`register`, `login` and `refresh` share one per-IP bucket (5/min, burst 5). On the frontend we'll make sure that only one refresh runs at a time, also across tabs, so rotation and the limit don't log people out.

Thanks again!

_Foodly frontend lead (P1umPudding/Foodly-FE)_
````
