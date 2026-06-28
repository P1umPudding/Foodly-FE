# Phase 3 — Koch-Modus · Implementation Plan

Derived from `phase-3-koch-modus.md`. Concrete file-by-file order, with risks and
verification hooks. Built entirely against the mocks (`VITE_MOCK=1 npm run dev`);
no backend, no persistence.

## Guiding constraints (from spec + CLAUDE.md)

- All interactive UI via `@postxl/ui-components` — only the `DurationPicker` is a
  deliberate hand-rolled exception (no component for a wheel picker).
- Tooltips via postxl `Tooltip` (never `title=""`). `TooltipProvider` already at root.
- Tailwind-first, no inline `style={{}}`; arbitrary values are fine. CSS in
  `styles.css` only where Tailwind genuinely can't reach (hide-scrollbar helper).
- Icons from `lucide-react` (already used across `src/`, resolvable transitively).
- Reduced-motion gates the alarm blink and any forced smooth-scroll.
- No persistence: recipe-local state resets on unmount/reload; timers survive
  **navigation** (provider lives above Routes) but **not** reload.

---

## Order of work (small, focused commits — Phase-1 granularity)

### A. Pure helper + test (foundation, no UI) — AC1

1. **`src/api/views.ts`** — add `scaleAmount(amount, factor)`:
   - `amount === null` → `null`.
   - Parse with comma **or** dot as decimal sep: normalise input by replacing
     `,` with `.`, then `Number(...)`. If `amount` trimmed is empty or
     `Number.isFinite` is false → return `amount` unchanged (defensive).
   - `factor === 1` → return `amount` unchanged (avoids reformatting `"500"`→`"500"`
     spuriously, and is the cheap identity path).
   - Otherwise compute `n * factor`, round to **max 2 decimals**
     (`Math.round(v * 100) / 100`), render with German comma and trimmed trailing
     zeros. Implementation: `String(rounded).replace('.', ',')` — JS number
     stringification already drops trailing zeros (`1.5`→`"1.5"`, `1000`→`"1000"`,
     `1.25`→`"1.25"`).
   - Guard: only the **numeric** part scales; prefix/unit untouched (those live in
     other fields, so `scaleAmount` only ever sees the number string).
2. **`src/api/views.test.ts`** — add a `describe('scaleAmount')` block covering the
   exact AC1 cases: `("500",2)→"1000"`, `("500",0.5)→"250"`, `("1",1.5)→"1,5"`,
   `(null,2)→null`, `("etwas",2)→"etwas"`, `("500",1)→"500"`. Plus: dot-input
   (`("0.5",1)`→unchanged since factor 1; `("2.5",2)→"5"`), comma-input
   (`("0,5",2)→"1"`), rounding (`("1",1/3)→"0,33"`), empty string unchanged.

Risk: `Number('')` is `0` (finite) — must treat empty/whitespace `amount` as
non-numeric explicitly. Handled by trimming and checking `=== ''` before `Number`.

### B. Ingredient check-off + scaling wiring (recipe-local) — AC2, AC3, AC4

3. **`src/components/recipe/IngredientLine.tsx`** — extend props:
   - `factor?: number` (default 1): before composing the quantity column, build a
     scaled copy of the line via `scaleAmount(line.amount, factor)` and feed it to
     `ingredientParts` (pass a `{ ...line, amount: scaled }` so prefix/unit/name
     stay intact). Keep `ingredientParts` pure/unchanged.
   - Check-off props: `checkable?: boolean`, `checked?: boolean`,
     `onToggle?: (id) => void`. When `checkable`, render a leading `<td>` with a
     postxl `Checkbox` (controlled by `checked`, `onCheckedChange`→`onToggle`).
     When checked: add `line-through` + dim to the row's text cells. Note the
     quantity cell already carries `text-foreground/75` (IngredientLine.tsx:11), so
     to avoid two competing text-color utilities (review nit #9), apply the dim with
     a class that wins — prefer adding opacity (`opacity-50`/`opacity-60`) on the
     row so both cells dim uniformly regardless of their own color, plus
     `line-through`. When `!checkable`: render exactly today's two-column row (no
     extra cell, no layout shift) — preserve the existing borderless look.
   - Decision: the checkbox column should not disturb the fixed `colgroup` widths.
     Render the checkbox cell **only** in checkable mode and add a matching `<col>`
     in `SectionBlock`'s colgroup conditionally (see step 4). Keep the quantity
     column right-aligned.

4. **`src/components/recipe/SectionBlock.tsx`** — thread through:
   - New props: `factor?: number`, `checkable?: boolean`,
     `checkedIds?: Set<RecipeIngredientId>`, `onToggle?: (id) => void`.
   - Adjust `colgroup`: when `checkable`, prepend a narrow `<col className="w-8" />`
     for the checkbox. Pass `factor` + per-line `checked`/`onToggle` to each
     `IngredientLine`.
   - Steps column is untouched (check-off is ingredients-only).

5. **`src/pages/RecipeDetail.tsx`** — own the recipe-local state + control row:
   - `const [factor, setFactor] = useState(1)` and
     `const [checkable, setCheckable] = useState(false)` and
     `const [checkedIds, setCheckedIds] = useState<Set<RecipeIngredientId>>(new Set())`.
   - State resets naturally on recipe change because `RecipeDetail` re-renders with
     a new `recipeId`; to be safe reset on `recipeId` change via `useEffect`
     (factor→1, checkable→false, checkedIds→empty) so navigating recipe→recipe
     clears cooking state (spec: reset on unmount / recipe switch).
   - Render the **control row** directly under the existing meta row (see C).
   - Pass `factor`, `checkable`, `checkedIds`, `onToggle` into each `SectionBlock`.
   - `onToggle(id)`: immutably add/remove from the Set.

### C. Detail layout — meta row stays, new control row — AC5, AC6

6. In `RecipeDetail`, **below** the existing meta `<div>` (rating · time · size),
   add a control row: `flex flex-wrap items-center justify-between gap-2`.
   - **Left group (spec §5 sketch order = Abhaken first, then wake-lock):** the
     "Abhaken" toggle then `WakeLockToggle`. Abhaken = a postxl `Toggle` or `Button`
     with `aria-pressed={checkable}`, lucide `ListChecks`; pick icon+text "Abhaken"
     for clarity, consistent compact size next to the icon-only wake-lock.
   - **Right:** `PortionScaler` (component from D), aligned under the size.
   - Always rendered, even when `recipe.amount === null`.
   - Wake-lock returns `null` when unsupported — left group then shows only Abhaken.

### D. PortionScaler — AC3

7. **`src/components/recipe/PortionScaler.tsx`** — props `{ factor, onChange }`.
   Three visual states driven by local `editing` boolean + the `factor` prop:
   - **Rest (factor === 1):** borderless pill button "× 1" with lucide `Scale`,
     muted; wrapped in postxl `Tooltip` "Mengen skalieren". Hover → border + subtle
     shadow (Tailwind `hover:border hover:shadow-sm`, border via the project's
     `border-border` default).
   - **Edit (click):** swap to a small postxl `Input` prefilled with the current
     factor rendered with German comma; accept comma or dot. Commit on
     Enter/blur, cancel on Escape. Parse via the same comma→dot normalise; apply
     reset rules **per spec §2** (review fix #4): empty / `0` / `1` → reset to ×1;
     **negative / NaN / otherwise invalid → ignore, keep the current factor
     unchanged** (do NOT reset to 1); a valid positive number → set it.
   - **Active (factor !== 1):** pill "× <factor>" (German comma via a tiny local
     `formatFactor`). Hover reveals a small "×" reset button (postxl `Button
     size="icon"` or inline) → `onChange(1)`.
   - Keep it self-contained; `RecipeDetail` only holds the number.

Risk: focus management — when entering edit mode, focus + select the input
(`useEffect` + ref). Escape must restore without committing.

### E. Timer domain (pure-ish) — AC7–AC11

8. **`src/timers/alarm.ts`** — no React. Exports:
   - `unlockAudio()`: **the only place an `AudioContext` is created/resumed**
     (review fix #5). Call it from a user gesture (timer `add`/start). Creating a
     context outside a gesture triggers a Chrome console warning → would break the
     clean-console AC12, so `startAlarm` must NOT create one.
   - `startAlarm(id)`: if no unlocked context exists, **no-op for sound** (still
     proceed with vibration); else play a repeating short beep pattern via an
     oscillator+gain envelope on an interval; also `navigator.vibrate?.(pattern)`.
     Track per-id so multiple alarms coexist.
   - `stopAlarm(id)`: stop this id's beep loop + vibration; close nothing global.
   - **Safety auto-stop after 60 s** per alarm.
   - Audio is best-effort: wrap in try/catch; if the context is unavailable or
     suspended the beep silently no-ops, visual/toast/vibration still fire.

9. **`src/timers/TimerProvider.tsx`** — context + `useTimers()`:
   - State: `Timer[]` (shape from spec: `id,label,durationMs,remainingMs,endAt,status`).
   - Single `setInterval(~250ms)` while any timer is `running`; each tick recomputes
     `remainingMs = max(0, endAt - now)` from the **absolute** `endAt` (background-tab
     safe).
   - **Expiry side-effects must NOT live inside the `setTimers` updater**
     (review fix #2 — StrictMode/double-invoke would double-fire). Pattern: the
     interval callback reads a **ref** to the current timers, detects which running
     timers just crossed 0, then (a) calls `setTimers` with a **pure** updater that
     only flips `running→expired`/`endAt=null`, and (b) **separately**, once per
     id, fires the side-effects `startAlarm(id)` + persistent `toast` + `vibrate`.
     Guard each transition so a timer fires its alarm **exactly once** (e.g. track
     an `alarmedIds` ref).
   - **Alarm toast** (review fix #3): sonner `toast(...)` with `duration: Infinity`
     and an action **Stopp** → `stopAlarm(id)` + dismiss; otherwise the default ~4 s
     auto-dismiss would remove the Stopp action while the 60 s beep continues. The
     `TimerRow` Stopp button is the backup path.
   - API: `add({label,durationMs})` (creates running timer with
     `endAt = now + durationMs`; also opportunistic audio unlock), `pause` (freeze
     `remainingMs`, `endAt=null`, status `paused`), `resume`
     (`endAt = now + remainingMs`, status `running`), `restart`
     (`remainingMs=durationMs`, running, `endAt=now+durationMs`, stopAlarm if was
     expired), `remove` (stopAlarm + drop), `stopAlarm(id)` (stop sound, keep row,
     leave status `expired` but mark alarm silenced — add an `alarming`/`silenced`
     concept; simplest: keep `status='expired'` and track a separate
     `Set<id>` of actively-alarming ids in provider, removed on stop).
   - `nextRemainingMs`: min `remainingMs` over running timers (or null).
   - Expose whether any timer is currently alarming (for Nav state).

   Risk: avoid stale closures in the interval — use a ref to latest timers or the
   functional `setTimers` updater computing from `now`. `Date.now()` is fine in app
   runtime (the workflow-script restriction does not apply to app code).

10. **`src/timers/TimerToggle.tsx`** (Nav): icon-only postxl `Button` (lucide
    `Timer`/`AlarmClock`) opening the panel; shows `nextRemainingMs` formatted
    `mm:ss` / `h:mm:ss` beside the icon only when ≥1 running; alarm state (e.g.
    `text-primary`/tinted) while any timer alarms. Wrap trigger so it controls the
    Sheet/Drawer open state (lift `open` state here or in panel).

11. **`src/timers/TimerPanel.tsx`**: `useIsMobile()` → render postxl `Sheet`
    (desktop, side right) or `Drawer` (mobile, bottom). Content: list of `TimerRow`
    (sorted by remaining asc, consistent) + `TimerForm`. Empty state "Kein Timer
    läuft". Controlled `open`/`onOpenChange` shared with `TimerToggle` (compose them
    so the trigger and panel agree — likely both live in one `Timer` nav component
    that holds `open` state, with `TimerToggle` as its trigger button).
    - **Required for clean-console AC12** (review fix #1): `SheetContent`/
      `DrawerContent` are Radix-Dialog-based and emit a console **error** without a
      title. Always include `SheetHeader`+`SheetTitle` (and `DrawerHeader`+
      `DrawerTitle`), e.g. "Timer" — visually hidden (`sr-only`) if a visible header
      isn't wanted. Add a `SheetDescription`/`DrawerDescription` (or
      `aria-describedby={undefined}`) to silence the description warning too.

12. **`src/timers/TimerRow.tsx`**: name (or "Timer") + countdown (`mm:ss`/`h:mm:ss`).
    Actions as postxl `Button size="icon"` + Tooltip: Pause/Resume (`Pause`/`Play`),
    Restart (`RotateCcw`), Delete (`Trash2`). Expired: row **blinks**
    (animation gated by `prefers-reduced-motion` → static strong highlight) and
    shows **Stopp** (`Square`) which calls `stopAlarm`.

13. **`src/timers/TimerForm.tsx`**: optional name `Input`; quick chips
    `1·3·5·10·15 min` (postxl `Button`/`Badge` toggles) that set the picker; the
    `DurationPicker` (Std:Min:Sek); "Timer starten" `Button` disabled when total
    duration is 0. Default duration on open `0:05:00`.

14. **`src/components/DurationPicker.tsx`** (deliberate exception):
    - Three columns Std(0–23)/Min(0–59)/Sek(0–59). Controlled value
      `{ h, m, s }` + `onChange`.
    - CSS scroll-snap (`snap-y snap-mandatory`) per column; center marker frame is a
      static overlay. Each value is a focusable option; clicking scrolls it to
      center; wheel + touch scroll work natively via overflow scroll; keyboard
      `↑`/`↓` on a focused column changes its value, `Tab` moves columns.
    - On scroll settle, compute the centered index → `onChange`. `scrollend` has
      uneven browser support, so a **timeout-after-scroll fallback is mandatory**
      (review nit #7): on each `scroll` reset a ~120 ms timer; when it fires read the
      snapped centered item. The "click value → center" path and external value
      writes (chip) set `scrollTop` behind a `programmaticScroll` flag so they don't
      re-enter `onChange`.
    - Hide scrollbars: a minimal `.hide-scrollbar` helper in `styles.css`
      (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`) — Tailwind can't
      express the webkit pseudo. `aria-label` per column ("Stunden"/"Minuten"/
      "Sekunden"). `prefers-reduced-motion`: don't force `scroll-behavior:smooth`.

    Risk (highest): keeping scroll position ↔ value in sync without feedback loops.
    Mitigation: write to DOM scrollTop only when the value changes externally (chip),
    and read centered index on user scroll; guard with a "programmatic scroll" flag.

### F. App wiring — AC7, AC11, AC12

15. **`src/components/Nav.tsx`**: remove `WakeLockToggle` import+usage; add the new
    Timer nav component (toggle + panel) in its place.

16. **`src/App.tsx`**: wrap **both** `Nav` and `main` in `TimerProvider` (inside
    `TooltipProvider`); leave `CatalogProvider` exactly where it is (around Routes in
    `main`). Mount sonner `<Toaster />` once at root. Remove nothing else.

---

## Cross-cutting / risk register

- **lucide-react** is not a direct dep but resolves (used already in `src/`); keep
  using it — do not add to package.json unless build fails.
- **Interval correctness**: derive remaining from `endAt`; never accumulate. One
  interval in the provider, not per row.
- **Multiple simultaneous alarms**: per-id alarm tracking in `alarm.ts` + provider;
  each Stopp affects only its id; each gets its own toast.
- **Reduced-motion**: gate blink + smooth-scroll; provide static fallback.
- **No layout regression** when check-off is off: IngredientLine must render
  byte-identical structure to today in non-checkable mode.
- **factor===1 identity**: `scaleAmount` returns input unchanged so existing recipes
  render exactly as before at rest.
- **Reset semantics**: empty/0/1/negative/NaN all collapse to factor 1.

## Verification (maps to ACs)

- `npm test` — new `scaleAmount` cases green, all existing green (AC1, AC12).
- `npm run build` — tsc + vite clean (AC12).
- Chrome MCP on `VITE_MOCK=1 npm run dev` (`/recipes/1`): control row layout (AC6),
  scale ×2 + reset (AC2/AC3), check-off toggle + strike/dim (AC4), wake-lock moved
  to control row & gone from Nav (AC5), timer open/countdown/nav badge (AC7),
  DurationPicker scroll+click+keyboard + chips (AC8), pause/resume/restart/delete
  (AC9), expiry toast+blink+nav alarm+Stopp with a ~3 s timer (AC10), survive nav /
  die on reload (AC11), clean console (AC12).

## Out of scope (spec §13) — do not build

Step-by-step mode; recipe/step-preset timers; persistence; "ergibt ~N Portionen"
hint; scaling amounts inside step prose; editing/rating/shopping list.
