# Folgen aus Backend-PR #22 (Bulk-User, accessSince, camelCase) — Issue-Plan

> Freigegeben von Daniel am 2026-11-12 (`dec_6000b8fe`). Die Abschnitte U1–U2 sind die Issue-Texte (Titel =
> Überschrift ohne „Ux —“). Review des PRs: `docs/backend-questions.md` (B2, B6, B16, Abschnitt „Review Backend-PR #22“).

Beide Issues sind `backend-blocked` durch [klassenserver7b/Foodly-backend#22](https://github.com/klassenserver7b/Foodly-backend/pull/22).
**U1 geht direkt nach dem Merge von #22 rein**: Ab dann lehnt das Backend `worktime`/`totaltime` mit 422 ab. Bis
dahin kennt Backend-`main` `workTime` nicht und würde still nach ID sortieren.
Labels: `alpha`, `backend-blocked`; U2 zusätzlich `ui`. `agent-ready` setzt der Lead, sobald #22 gemergt ist.
Lokale Checks statt CI (ADR 0004): `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`,
`npm run lint`.

| # | Issue | Hängt ab von |
|---|---|---|
| U1 | Sortierfelder in camelCase (`workTime`, `totalTime`) | Backend #22 |
| U2 | Benutzernamen über `GET /users?ids=` statt `listUsers`-Mock | Backend #22 |

D3 (Phase 5) hängt zusätzlich an U1 (gleiche Stelle `RecipeSortField`).

---

## U1 — Sortierfelder in camelCase (`workTime`, `totalTime`)

Labels: alpha, backend-blocked · Depends on: klassenserver7b/Foodly-backend#22

### Context
Das Backend hat sich auf camelCase festgelegt (Backend-PR #22, Commit „normalize sort field spellings to camelCase“).
`sort.field` akzeptiert danach nur `name`, `workTime` | `work_time`, `totalTime` | `total_time`, `rating`, `accessSince`
und antwortet sonst mit 422 („sort.field must be one of …“). Das FE schickt heute `worktime`/`totaltime`
(`RecipeSortField` in `src/api/protocol.ts`, Map `SORT_FIELD` in `src/list/query.ts`). Alle anderen Wire-Felder sind
schon camelCase.

### Goal
Sortieren nach Arbeits- und Gesamtzeit funktioniert gegen Backend-`main` nach #22.

### Behaviour
- `RecipeSortField = 'name' | 'workTime' | 'totalTime' | 'rating'`.
- `SORT_FIELD` in `src/list/query.ts`: `work: 'workTime'`, `overall: 'totalTime'`; die Mock-Sortierung (`sortValue`)
  nutzt dieselben Werte.
- Der URL- und `localStorage`-Zustand der Liste (`sort=work|overall`) bleibt unverändert: Nur der Wire-Wert ändert sich.

### Acceptance criteria
1. `buildSearchQuery` mit `sortKey: 'work'` liefert `sort.field === 'workTime'`, mit `'overall'` `'totalTime'` (Tests in
   `query.test.ts` angepasst).
2. Mock-Modus sortiert nach Arbeits-/Gesamtzeit wie vorher (bestehende Tests grün).
3. Im Code kommt `worktime`/`totaltime` nicht mehr vor (`rg -i "worktime|totaltime" src` ohne Treffer außer
   `workTime`/`totalTime`).
4. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das und nennt den Merge von Backend #22.

### Non-goals
- `accessSince` (D3). Sortieren nach `createdAt`/`updatedAt` (B15).

### Assumptions
- #22 ist gemergt, bevor dieser PR gemergt wird.

### Affected areas
`src/api/protocol.ts`, `src/list/query.ts` (+test), ggf. `src/mocks/search.test.ts`.

---

## U2 — Benutzernamen über `GET /users?ids=` statt `listUsers`-Mock

Labels: alpha, ui, backend-blocked · Depends on: klassenserver7b/Foodly-backend#22

### Context
B2 (`docs/backend-questions.md`). `foodly.listUsers` geht heute auch im REST-Modus an den Mock (`src/api/index.ts`). Der
Katalog (`src/catalog/CatalogProvider.tsx`) lädt die Mock-Liste einmal als `users.byId`, `useUser(id)` liest daraus
(`RecipeTile` „von <Name>“, `Rating`). Weil Mock-IDs zu echten IDs passen könnten, zeigt `RecipeTile` Namen nur, wenn
`knowsUserNames()` (= Mock-Modus) wahr ist. Backend-PR #22 bringt `GET /users?ids=2,3,5` →
`{ data: [{ id, name, profilePicture }] }`: max. 100 IDs pro Request (sonst 422), unbekannte IDs fehlen, Reihenfolge
beliebig, leeres `ids` → `{ data: [] }`.

### Goal
Namen von Ownern, Editoren und Bewertenden kommen im REST-Modus vom Backend; der `listUsers`-Mock entfällt.

### Behaviour
- `foodly.getUsers(ids: UserId[]): Promise<User[]>`: REST teilt in Pakete à 100 (parallel) und fügt die Antworten
  zusammen; leere Eingabe → `[]` ohne Request. Mock-Zweig `users.get` mit derselben Semantik (unbekannte IDs fehlen).
  `foodly.listUsers` und der Mock-Handler `users.list` entfallen.
- Katalog: `users.byId` wird bei Bedarf gefüllt. `useUser(id)` meldet unbekannte IDs an; der Katalog sammelt sie (ein
  Request pro Render-Tick, z. B. per Microtask), fragt nur IDs ab, die weder bekannt noch unterwegs sind, und merkt sich
  auch nicht gefundene IDs (kein Dauer-Nachfragen). `me` wird direkt eingetragen. Fehler: IDs gelten als nicht gefunden
  und werden beim nächsten Laden der Seite erneut versucht; die UI zeigt dann wie heute keinen Namen.
- `knowsUserNames()` entfällt; `RecipeTile` zeigt „von <Name>“, sobald der Name da ist.
- Der Katalog wartet beim Start nicht mehr auf Benutzer (die `settled`-Schranke verliert `usersReq`).
- Doku im selben PR: `CLAUDE.md` (Abschnitte zu `listUsers`, „Every `foodly.*` method …“, `VITE_MOCK`-Tabelle),
  `docs/architecture.md` §1 und Kommentare in `src/main.tsx`, `src/api/socket.ts`, `src/mocks/index.ts`, die
  `listUsers` als REST-Ausnahme nennen.

### Acceptance criteria
1. REST-Test: `getUsers([1..150])` schickt zwei Requests (`ids=1,…,100` und `ids=101,…,150`) und liefert alle Treffer;
   `getUsers([])` schickt keinen (gemocktes `fetch`).
2. Katalog-Test: zwei Komponenten mit `useUser(2)` und `useUser(3)` im selben Render lösen **einen** Request mit
   `ids=2,3` aus; ein erneutes Rendern keinen weiteren.
3. Unbekannte ID: kein zweiter Request für dieselbe ID (Test).
4. REST-Modus: `RecipeTile` eines fremden Rezepts zeigt „von <Name>“ aus der Backend-Antwort (Test mit gemocktem
   `foodly`).
5. `rg "listUsers|knowsUserNames|users.list" src` ohne Treffer.
6. Mock-Modus zeigt Namen wie vorher (bestehende Tests grün).
7. Doku-Stellen aktualisiert (CLAUDE.md, architecture.md).
8. Lokale Checks grün (alle fünf), PR-Beschreibung sagt das.

### Non-goals
- Profilbilder anzeigen. Benutzer-Suche fürs Teilen (B4).

### Assumptions
- Das Backend beschränkt `GET /users?ids=` (noch) nicht auf Nutzer, mit denen man teilt (Review-Hinweis in
  `backend-questions.md`). Für das FE ändert eine spätere Beschränkung nichts: Nicht gelieferte IDs bleiben ohne Namen.

### Affected areas
`src/api/index.ts` (+test), `src/mocks/index.ts`, `src/catalog/CatalogProvider.tsx` (+test),
`src/components/recipe/RecipeTile.tsx` (+test), `src/main.tsx`, `src/api/socket.ts` (Kommentar), `CLAUDE.md`,
`docs/architecture.md`.
