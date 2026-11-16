# Plan #231 — Mockup-Angleich V5: Editor-Aufbau mit Seitenspalte, Status oben

Spec: .git/agent-work/spec.md (assumptions A1–A11). Copy of this plan goes to
`docs/superpowers/plans/2026-11-14-mockup-v5-editor-aufbau.md` (repo convention).
Mockup reference: `docs/design/redesign/app.js` 717–804 (`S.editor`), `screens.css` 615–760, 1753–1875, 1979–2007.
Breakpoint: Tailwind `phone:` = `width < 761px` (matches "bis 760 px gestapelt").
No API change; `RowActions`, `SectionEditor`, `IngredientRow`, `StepRow` stay untouched (V6 #232).

## Step 1 — Header status + actions (A1, A2, A10; AC1)
- `src/components/editor/SaveStatus.tsx` → `SaveStatusIndicator({ status, onRetry })`:
  - idle / saved: `CircleCheck` icon + `<span className="phone:sr-only">Gespeichert</span>`, `text-xs text-muted-foreground`
    (mockup `.saved` 13 px subtle). No time, no "automatisch gesichert".
  - saving: `Loader2` spin + "Speichert …" (text `phone:sr-only`).
  - error: `role="alert"`, `AlertTriangle` + "Nicht gespeichert" (`phone:sr-only`) + `Button variant="outline" size="sm"`
    "Erneut versuchen"; on phone the button is icon-only (`RotateCw`, `aria-label="Erneut versuchen"`, `phone:size-10`).
    Implementation: label text in `<span className="phone:hidden">`, icon `hidden phone:inline`, aria-label set always.
- `src/pages/RecipeEditor.tsx`:
  - Remove the fixed footer and `pb-28`; wrap content in `Page` (max 1080, mockup padding) with `pb-10`.
  - `<HeaderActions>` only in the ready state (not on loading/error/no-access, A9):
    - edit: SaveStatusIndicator (same visibility rule as today), size-error `role="status"` span (always mounted; text
      "Portionen prüfen", phone: icon + `sr-only` text), "Fertig" primary button (same aria-disabled/busy logic).
    - new: "Anlegen" primary (same logic), no status. No Verwerfen button: the shell back arrow is "Verwerfen" (A2).
      `createError` → `toast.error(...)` instead of inline text (drop `createError` state).
  - `AppShell.tsx` comment about the editor footer (`--shell-bottom`) updated (A10); check whether `--shell-bottom`
    is still used elsewhere (TabBar/Toaster) — only touch the comment.
- Tests:
  - `RecipeEditor.test.tsx`/`.route.test.tsx`: adapt Verwerfen/createError tests (create failure → toast), status texts.
  - New test (route test, rendered inside AppShell or via the HeaderActions slot): "Änderungen werden automatisch
    gesichert" absent; "Fertig" and status are inside the header actions container (AC1). Use whatever container
    AppShell exposes (data-testid or `banner` role) — check AppShell.header.test.tsx for the pattern.
- Commit: "Editor: Status und Fertig/Anlegen in der Kopfzeile, Fußleiste entfällt (#231)".

## Step 2 — Two-column layout + side column skeleton (A6, A9, A11)
- `RecipeEditor.tsx` ready state: `div` grid
  `grid grid-cols-[minmax(0,1fr)_280px] items-start gap-8 phone:flex phone:flex-col phone:gap-5`.
  - main column `flex flex-col gap-[18px]`: BasicsCard, sections, "+ Abschnitt" (unchanged button, V6), 
  - aside `sticky top-[84px]` (phone: static) containing `EditorSidebar`.
  - Phone order "Bilder above main card": render `ImageManager` once; achieve order with `phone:contents` on the aside
    and `phone:order-*` on its children (images `order-first`, notes/source/hint `order-last`) — single DOM render,
    no duplicate `id`. Verify visually; fallback if `contents` breaks sticky: acceptable since sticky only on desktop.
- New `src/components/editor/EditorSidebar.tsx`: sections "Bilder" (ImageManager), "Notizen" (NotesEditor),
  "Quelle" (Input `recipe-source`, moved out of BasicsCard), hint
  "Kategorien setzt du im Rezept über „+“ – gehört nicht zum Rezept selbst." (`text-xs text-muted-foreground`).
  Section headings like mockup `.col-h` (12/600 subtle) — use an `h2`-ish `<h2 className="text-xs font-semibold text-muted-foreground">`.
- Loading skeleton two-column (same grid: big `Skeleton` left, smaller right) (A9).
- Tests: Quelle still edits `source` (existing test or new); skeleton not required to test.
- Commit: "Editor: zwei Spalten mit Seitenspalte (Bilder, Notizen, Quelle) (#231)".

## Step 3 — Basics card per mockup (A8; AC2)
- `BasicsCard`: remove Quelle + Notizen; `Card` with `CardContent` padding 16 / gap 16 (`p-4 flex flex-col gap-4`, phone `p-3.5`).
  - Titel: big Input (`h-[46px] text-[19px] font-semibold`), Vorschau below stays.
  - Zeiten: grid `grid-cols-[repeat(2,minmax(0,160px))] gap-3` (phone `grid-cols-2 gap-2`); each Input with "min" suffix
    inside the field: wrapper `relative`, Input `pr-10`, `<span aria-hidden className="pointer-events-none absolute right-3 ... text-muted-foreground">min</span>`;
    accessible label stays "Arbeitszeit"/"Gesamtzeit" (Label htmlFor). Keep `type=number`, hide spinner if a util exists.
- `SizeField`: replace RadioGroup with the V1 segment (ToggleGroup type=single + FocusToggleGroupItem, track
  `gap-0.5 rounded-lg bg-seg p-0.5`, selected `bg-card text-foreground shadow-seg`), `aria-label="Größe"`, items
  "Portionen"/"Freitext" (radios via Radix → existing tests keep `role="radio"`). Ignore empty value on re-click.
  Fields row `mt-2 flex gap-2`: number `w-[72px]`, text `flex-1`; placeholder "26 cm {Springform}".
  Hint below (`text-xs text-muted-foreground`), literal:
  "Portionen: Beim Kochen wählt man die Anzahl, Mengen rechnen sich um. Freitext (z. B. „26 cm {Springform}“): Man skaliert mit einem Faktor ×½, ×2 …"
  Error text stays.
- Tests: `SizeField.test.tsx` adapted (radio names, placeholder 26 cm); AC2 switching portions ↔ text clears sizeNumber.
- Commit: "Editor: Grunddaten wie Mockup (Titel groß, min im Feld, Größe als Segment) (#231)".

## Step 4 — Tags as one combobox field (A7; AC3)
- Rewrite `TagPicker.tsx`: one bordered field (`flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border px-2 py-[5px]`,
  focus-within ring like Input) with removable chips (TagChip look: `bg-tag h-[22px] text-xs`, icon kept) — each chip has
  a postxl `Button variant="ghost"` ✕ `aria-label="<tag> entfernen"` — and a postxl `Input` (borderless, `min-w-[100px] flex-1`,
  placeholder "Tag hinzufügen", `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`).
  Suggestions: `Popover` + `PopoverAnchor` (the field) + `PopoverContent` (`onOpenAutoFocus` prevented, `align="start"`, width = field)
  containing `Command` with `shouldFilter={false}` + `CommandList`/`CommandItem`s — filtering by our own query
  (case-insensitive `includes`), excluding selected tags. Keyboard handled on the Input: ArrowDown/Up move the active
  index, Enter adds the active (no-op without matches / unknown text), Escape closes, Backspace on empty query removes
  the last chip. Click on an item adds it. Open on focus/typing. "Kein passender Tag." when nothing matches.
  - If Command's own keyboard handling fights the Input outside it, drop Command and render a plain `role="listbox"`
    list of `role="option"` divs styled like CommandItem (allowed: not interactive controls, just options).
- Tests new `TagPicker.test.tsx`: type "veg", ArrowDown+Enter adds chip, onChange called; Backspace on empty removes
  last; ✕ button by label removes; Escape closes listbox (AC3).
- Commit: "Editor: Tags als ein Feld mit Chips und Vorschlägen (#231)".

## Step 5 — Notes with ⋮ menu (A3; AC4)
- New `src/components/editor/NotesEditor.tsx` (used by EditorSidebar): per note grid `grid-cols-[minmax(0,1fr)_30px] gap-1`:
  postxl `Textarea` (`rows={2}`, `resize-none`, `aria-label="Notiz N"`) + new `RowMenu`.
- New `src/components/editor/RowMenu.tsx`: `DropdownMenu modal={false}` with `TriggerButton variant="ghost" size="icon"`
  `EllipsisVertical`, `aria-label` prop (e.g. "Notiz 1: Aktionen"), touch 40 px; items "Nach oben", "Nach unten"
  (disabled at ends), "Entfernen" (destructive). Generic enough for V6 to reuse, but only notes use it now.
- "+ Notiz" ghost sm button, muted colour (mockup `.btn.add`).
- Tests `NotesEditor.test.tsx`: open menu, "Nach unten" moves note 1 below 2; "Entfernen" removes; ends disabled (AC4).
  Adapt any test that used "Notiz hinzufügen"/"Notiz 1 entfernen".
- Commit: "Editor: Notizen als Textfelder mit ⋮-Menü (#231)".

## Step 6 — Images in the side column (A4, A5)
- Rewrite `ImageManager.tsx` render:
  - no images: dashed full-width `aspect-[4/3]` Label tile (for the hidden file input) with `ImageIcon`, "Fotos hinzufügen",
    "Das erste wird Hauptbild" (`text-xs`).
  - with images: main image `relative aspect-[4/3] w-full overflow-hidden rounded-lg` (phone `aspect-video`) with badge
    "Hauptbild" (`absolute left-2 top-2 rounded-sm bg-black/55 px-[7px] py-0.5 text-[11px] font-semibold text-white`);
    gallery `grid grid-cols-4 gap-1.5 mt-1.5` (phone `grid-cols-5`) of square thumbs + small dashed + tile;
    hint "Bild antippen: als Hauptbild setzen oder entfernen.".
  - every image is a `DropdownMenu` trigger (TriggerButton/Button `variant="ghost"` with `p-0` wrapping the image,
    `aria-label="Hauptbild"` / `"Bild N"`); menu: gallery image → "Als Hauptbild", "Entfernen"; main → "Entfernen".
    "Entfernen" on main: mainImage null (keep today's behaviour: gallery not promoted).
  - upload: `multiple`, sequential loop; keep a local ref of the current `{mainImage, images}` updated after each success
    so later uploads don't use stale props; first becomes main when none; one toast per failure, `uploading` disables input.
- Tests `ImageManager.test.tsx` adapted: menu "Als Hauptbild" swaps; "Entfernen" removes; multi-file upload of 2 files →
  first main, second gallery, both uploaded in order; a failure in the middle keeps the others.
- Commit: "Editor: Bilder in der Seitenspalte mit Hauptbild, Galerie und Mehrfach-Upload (#231)".

## Step 7 — Docs, format, checks, screenshots
- Plan copy to `docs/superpowers/plans/2026-11-14-mockup-v5-editor-aufbau.md`; `docs/design.md` short note if a rule
  changes (editor header status) — only if there is an editor section to update.
- `npm run format`, then all five checks: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`,
  `npm run format:check`, `npm run lint` (no new suppressions).
- Screenshots (AC5): Playwright in `$SKAILE_SESSION_SCRATCH` (never in project deps), app via `VITE_MOCK=1` dev server,
  mockup via `python3 -m http.server` in `docs/design/redesign` (`app.html?theme=light|dark#/editor`); desktop 1440 light/dark
  app + mockup, phone 390 app light. Stored in scratch; committed temporarily for the PR description then removed
  (pattern from #227), or uploaded otherwise — decided in the PR step.

## AC → verification
1. Step 1 test (no "automatisch gesichert"; Fertig + status in header).
2. Step 3 SizeField tests + existing RecipeEditor size tests green.
3. Step 4 TagPicker keyboard tests.
4. Step 5 NotesEditor menu tests.
5. Step 7 screenshots.
6. Step 7 five checks.

## Revisions after review pass 1 (override the steps above where they differ)
- R1 (M1) Tap targets: every icon button (retry, ⋮, chip ✕, image triggers) gets `touch:size-10` (design.md §7 uses
  `touch:`, not `phone:`); tag input uses the same touch text size as the other Inputs (check Input's base classes).
- R2 (M2) Sidebar is flat: `EditorSidebar` returns a fragment-like set of direct children of the aside
  (`images` block, `notes` block, `source` block, `hint`), each with `phone:order-*`; aside `phone:contents`;
  main-card container `phone:contents` too, so images (`phone:order-first`), main items (order 0), notes/source/hint
  (`phone:order-last`) share one flex column. `<fieldset disabled={creating} className="contents">` wraps the whole grid.
  Keyboard order on phone differs from visual (images after main in DOM) — noted in PR (phone polish = #217/#218).
- R3 (M3) Uploads: new pure `addImage(draft, ref)` in `src/editor/draft.ts` (first becomes main if none, else append);
  `ImageManager` gets `onAdd(ref)` and RecipeEditor passes `(ref) => setDraft(d => d && addImage(d, ref))`. Sequential loop,
  no local ref. Unit test for `addImage`.
- R4 (M4) Step 2 moves today's notes markup unchanged into `NotesEditor.tsx`; Step 5 restyles it + RowMenu.
- R5 (M5) AC1 test mounts inside `AppShell` (pattern of AppShell.header.test.tsx), queries `within(getByRole('banner'))`
  for "Fertig" + "Gespeichert"; "automatisch gesichert" absent; second case `/recipes/new` with "Anlegen".
- R6 (M6) Tag suggestions: inline absolutely positioned `role="listbox"` under the field (no Popover/portal), options
  `role="option"` with stable ids, `aria-activedescendant`, `onMouseDown` preventDefault so input keeps focus, close on blur.
  Options are non-interactive divs (keyboard lives on the postxl Input), so no raw controls.
- R7 (m1) Text sizes via scale tokens (`text-lg font-semibold` for title, `text-xs`), no `text-[NNpx]`; title height via
  Tailwind `h-11` only if Input has no larger size prop.
- R8 (m2) Keep the two-text logic: size error shows "Nicht gespeichert – Portionen prüfen" when no save error, otherwise
  "Portionen prüfen" (phone: icon + sr-only text).
- R9 (m3) Segment: `onValueChange={v => v && …}`, `aria-label="Größe"` on root; check no test queries `radiogroup`.
- R10 (m4) Screenshots: no Chrome MCP in this environment; Dispatcher explicitly asked for headless Chrome via Playwright in
  scratch (never project deps). State in PR.
- R11 (m5) Step 7: remove "Editor-Leiste" from design.md's fixed-bottom-bars list; copy spec to
  `docs/superpowers/specs/2026-11-14-mockup-v5-editor-aufbau-design.md`.
- R12 (m6) Sticky aside: `max-h-[calc(100dvh-84px)] overflow-y-auto` on desktop.
- R13 (m7) Create-error toast "Rezept konnte nicht angelegt werden." tested via `vi.spyOn(toast, 'error')`.
- R14 (nits) Drop the number-spinner idea; RowMenu stays note-specific (`NoteMenu`), V6 can generalise; keep the
  always-mounted size-status comment; notes keyed by `note.key`.

## Review log
- Review pass 1 (fresh subagent): 0 blocker, 6 major, 7 minor, 4 nit. All majors and minors applied as R1–R14.

## Revisions after review pass 2 (override earlier text where they differ)
- S1 Image triggers: no touch size class (already ≥40 px; `h-auto p-0`). Retry: `touch:h-10`, `phone:size-10` only in icon-only state.
- S2 `mainImage === null && images.length > 0`: dashed 4:3 tile "Fotos hinzufügen" in the main slot above the gallery (tested).
- S3 Minutes via postxl `NumberInput` with `suffix="min"` (+ `showSpinButtons={false}`), Label htmlFor kept.
- S4 Upload: `const files = Array.from(e.target.files ?? [])` before resetting value; hidden `peer` input precedes every
  upload Label (both tiles in one parent, or separate peers per tile via the same input id is not possible → put the input
  first in the ImageManager root and the tiles as later siblings, or use `group-data` on a wrapper flag `uploading`).
- S5 Accessible names: Quelle heading = `<Label htmlFor="recipe-source">` styled as column heading; tag Input gets id +
  `<Label htmlFor>`; tests assert by label.
- S6 Create error toast: `Rezept konnte nicht angelegt werden: ${errorMessage(e, 'unbekannter Fehler')}`; rewrite the
  route tests for create failure and Verwerfen (lines ~510–540).
- S7 Image triggers: `alt=""` on the img, trigger aria-label "Hauptbild"/"Bild N"; update tests querying alt "Hauptbild";
  ImageManager test harness gets `onAdd`.
- S8 AC1 test in new `src/pages/RecipeEditor.header.test.tsx` with full provider/mock setup like AppShell.header.test.tsx.
- S9 Listbox: `absolute z-20 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover`, `scrollIntoView?.({block:'nearest'})`,
  `useId` ids, wrapper mousedown focuses input, focus-within border only.
- S10 Notes grid `touch:grid-cols-[minmax(0,1fr)_40px]`; chip ✕ enlarges hit area via `after:` pseudo, not size.
- S11 Drop R12 (no max-height/overflow on the sticky column) — accepted limitation.
- S12 Side column element is a `div` (not `aside`) because of `phone:contents`.
- S13 A8 wording: segment items keep `role="radio"` (root is `group`).
- S14 `--shell-left/--shell-bottom`: check consumers; if none remain, remove them and the architecture.md mention;
  otherwise only fix the comment.
- S15 No `Co-Authored-By` trailer in commits (CLAUDE.md overrides harness default).

## Review log (cont.)
- Review pass 2 (fresh subagent): 0 blocker, 3 major, 8 minor, 4 nit. All applied as S1–S15.
