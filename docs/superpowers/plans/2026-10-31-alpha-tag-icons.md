# Plan: #38 Tag icons via GET /tags/{id}/icon

Spec: `.git/agent-work/spec.md` (assumptions A1–A6). `GET /api/v1/tags/{id}/icon` sits behind the backend's `auth_middleware` and answers 401 without `Authorization: Bearer`; `<img>` sends none (AC2), so REST mode loads the icon as a blob through `src/api/rest.ts` and renders a cached object URL. Vitest runs in REST mode by default (`VITE_MOCK` unset).

## Step 1: `rest.getBlob` (`src/api/rest.ts`)
- Add `apiUrl(path)` (= `${BASE}${path}`), reused by `request`/`requestBinary`.
- Add `rest.getBlob(path): Promise<Blob>`: GET with the Bearer header, throws `Error(errorMessage)` on !ok, returns `res.blob()`.
- `rest.test.ts`: getBlob sends Bearer, returns the blob; throws on 404.
- Commit: `REST: Blob-GET für Binärantworten`

## Step 2: icon loading + TagIcon (one commit, so every commit builds and REST never points `<img>` at an auth-only URL)
- `src/api/assets.ts`:
  - Private `tagIconPath(tag)` = `/tags/${encodeURIComponent(tag.id)}/icon`.
  - `tagImageSrc(tag: Tag): string`: mock → `publicUrl('tags/<tag.svg>.svg')` (unchanged); REST → `apiUrl(tagIconPath(tag))`. Why-comment: the REST URL needs the Bearer, so it never goes into `<img src>` directly (AC1).
  - `loadTagIcon(tag): Promise<string | null>`: `svg === null` → null; mock → `tagImageSrc(tag)`; REST → in-flight promise Map keyed `${id}\u0000${svg}` (dedupes concurrent loads) of `rest.getBlob(path)` → `URL.createObjectURL`; error → null, cached for the session. Settled results go into a second Map read by `peekTagIcon`. Object URLs are never revoked (bounded by tag count) — one-line why.
  - Blob re-typing only when `blob.type` is `''` or `application/octet-stream` → `image/svg+xml` (the backend sets `image/svg+xml`, but an untyped SVG would not render in `<img>`; rasters sniff fine).
  - `peekTagIcon(tag): string | null | undefined` (undefined = not settled; mock always settled synchronously → first paint unchanged).
  - `resetTagIconCache()` (test-only).
  - Mode switch: `const USE_MOCKS = import.meta.env.VITE_MOCK === '1'` (as index.ts/stubs.ts).
  - Replace the stale header ("hash→URL scheme TBD").
- `src/hooks/useTagIcon.ts`: `useTagIcon(tag): string | null`. Returns `peekTagIcon(tag) ?? null`; effect (deps `tag.id`, `tag.svg`) calls `loadTagIcon` only when peek is `undefined` and forces a rerender (`useState` counter) with an `active` guard. No duplicate state → a changed tag can never show the old icon.
- `src/components/TagText.tsx`: `TagIcon({ tag, alt, size, fallback = null })`: src from the hook; no src → `fallback`; `<img onError>` stores the failed src, `failedSrc === src` → `fallback` (no broken-image icon). `TagText` passes `fallback={id}`.
- Callers: `TagChips.tsx` passes the Tag; while loading/failed it shows the plain name span (same classes as the no-icon branch) without the hover tooltip. `FilterControls.tsx`, `TagPicker.tsx` (2×) pass the Tag, no fallback (name is next to it); drop the `svg!` assertions.
- Tests:
  - `assets.test.ts` (resetModules pattern): URL in both modes with stubbed `VITE_API_URL` (`https://api.example/v1`) and BASE_URL; encoding (`Süß/Sauer`); loader: concurrent loads → one fetch; 404 → null and cached (no 2nd fetch); `svg: null` → null, no fetch; untyped blob re-typed (assert `type` only); mock → public URL. Stub `URL.createObjectURL`.
  - `src/components/TagText.test.tsx` (new, no resetModules; `vi.mock('../catalog/CatalogProvider')` for `useTags`; fetch spied; createObjectURL stubbed; `resetTagIconCache()` in afterEach): pending → name, no img; resolved → img with object URL + alt; 404 → name, no img; `svg: null` → name, no fetch; `{!id}` → name; img `error` event → name.
- Commit: `Tag-Icons im REST-Modus über GET /tags/{id}/icon laden`

## Step 3: docs
- `docs/backend-questions.md`: G3 table row (l.37) → „gelöst“, and the G3 note (~l.195): FE loads as blob because the route needs a Bearer (AC4).
- `docs/architecture.md` §2 asset line and CLAUDE.md "`assets.ts` — image/icon URLs": tag icons are loaded as blobs in `assets.ts` (route needs Bearer); `useTagIcon` is the one hook that calls `assets.ts` instead of `foodly.*`.
- Copy this plan to `docs/superpowers/plans/2026-10-31-alpha-tag-icons.md`.
- Commit: `Docs: G3 Tag-Icons gelöst`

## Verification
- AC1/AC2: assets.test.ts, rest.test.ts; PR explains the 401 (backend `src/lib.rs` route_layer) with a curl one-liner to reproduce.
- AC3: TagText.test.tsx. No backend runs in this container; PR notes say how to check manually (upload via `PUT /tags/{id}/icon`, `VITE_MOCK` unset).
- AC4: docs diff. AC5: `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`.
- Mock mode unchanged: mock URL test + existing suite. PR notes: failures are cached per session (reload retries); a missing mock SVG now shows the name instead of a broken image.

## Review log
- Review pass 1 (fresh subagent): blocker step-2 build break → TagIcon switched in step 2; major: stale state on tag change (keyed state), untyped blob (re-wrap as image/svg+xml), unused REST URL (shared tagIconPath); minor: test mode switching, both G3 spots + stale header, TagChips fallback without tooltip. Nits accepted as-is (failures cached per session → PR note; filter chips widen when icon arrives).
- Review pass 2 (fresh subagent): no blocker. Major: undefined step-2 behaviour → steps 2+3 merged into one commit; over-broad blob re-typing → only '' / octet-stream. Minor: CatalogProvider mock in TagText test, plan copied to docs/superpowers/plans, architecture.md/CLAUDE.md asset note, hook simplified to peek + rerender counter. Nits folded into PR notes.
