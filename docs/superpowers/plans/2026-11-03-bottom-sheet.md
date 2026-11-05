# Plan #59: shared BottomSheet for the Timer and Rating sheets

Base: origin/main 3cfd3a9, branch agent/issue-59. Spec: issue #59.

## Worker assumptions
- W1 Lib-✕: `SheetContent` has no prop for its built-in close (always first child, 16 px, sr-only "Close"). BottomSheet hides it with `[&>button:first-child]:hidden` (display:none also removes it from tab order / a11y tree) and renders its own `<Button asChild variant="ghost" size="icon" className="size-10" aria-label="Schließen"><SheetClose>…X icon…</SheetClose></Button>` (postxl Button has asChild; avoids the forwardRef warning). Test guards the structure (lib button is the first child, own ✕ second), since vitest loads no Tailwind CSS.
- W2 Scope of the component: BottomSheet replaces the *content* part (SheetContent + grip + SheetHeader/Title/sr-only Description + body). The caller keeps its `<Sheet open/onOpenChange/modal>` root and trigger, because Rating switches Popover/Sheet roots with a shared Trigger. "modal durchreichbar" is therefore satisfied on the root; BottomSheet passes through `onInteractOutside`, `onCloseAutoFocus` and `__e2e_test_id__` (AppShell.test relies on `data-test-id="timer-sheet"`).
- W3 Body layout: BottomSheet offers the standard scrolling body (`min-h-0 flex-1 overflow-y-auto px-4 pb-4`) and an opt-out (e.g. `scroll={false}`) under which the caller lays out its children itself. TimerPanel uses the opt-out (stationary form, only the list scrolls), Rating uses the default. Visuals stay as today.
- W4 ✕ position: absolutely positioned in the top-right corner (about `right-1 top-1`, centre roughly where the lib ✕ was), placed in the DOM before the content so it stays the first focusable element (Radix auto-focus on open unchanged). No `onOpenAutoFocus` override.
- W5 AC2 test in jsdom (no layout): assert `aria-label="Schließen"` and class `size-10` (twMerge drops `size-9`).
- W6 AC3: existing tests don't cover the toast path; add a TimerPanel test that a pointerdown inside `[data-sonner-toaster]` keeps the sheet open, plus that the sheet stays non-modal. Rating.test's click on `{name: 'Close'}` moves to "Schließen".
- W7 Non-goals added: reduced-motion gating of the lib slide animation; no change to the desktop Popover branches.




## Component API (`src/components/BottomSheet.tsx`)
```tsx
type BottomSheetProps = Omit<ComponentPropsWithoutRef<typeof SheetContent>, 'side' | 'title'> & {
  title: ReactNode          // SheetTitle text
  description: string       // sr-only SheetDescription
  scroll?: boolean          // default true: body wrapped in `min-h-0 flex-1 overflow-y-auto px-4 pb-4`;
                            // false: children laid out by the caller (TimerPanel: fixed form + scrolling list)
}
```
Renders:
```
<SheetContent side="bottom" {...props}
  className={cn('flex max-h-[80vh] flex-col gap-0 rounded-t-lg px-0 pb-[env(safe-area-inset-bottom)] [&>button:first-child]:hidden', className)}>
  <Button asChild variant="ghost" size="icon" className="absolute top-1 right-1 size-10" aria-label="Schließen">
    <SheetClose><X />   // size from the Button: [&_svg:not([class*=size-])]:size-4</SheetClose>
  </Button>
  <div aria-hidden className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
  <SheetHeader className="px-4 pb-3"><SheetTitle>{title}</SheetTitle><SheetDescription className="sr-only">{description}</SheetDescription></SheetHeader>
  {scroll ? <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div> : children}
</SheetContent>
```
- Caller keeps `<Sheet open/onOpenChange/modal>` root + trigger (W2). `onInteractOutside`, `onCloseAutoFocus`, `__e2e_test_id__` flow through `...props`.
- Lib ✕ hidden via first-child selector (W1); short "why" comment (lib has no prop, the selector depends on it being the first child — a test guards that).
- Own ✕ is the first focusable element → Radix auto-focus on open unchanged (W4). `Button asChild` + `SheetClose` avoids a raw `<button>` and the forwardRef warning (postxl Button isn't forwardRef). `size-10` overrides the lib's 36 px `size-9` (§7).
- Destructure `title`, `description`, `scroll`, `className`, `children` so `title` never reaches the DOM.
- `X` from lucide-react (already used, e.g. Lightbox).
- One-line comment why `Button asChild` wraps `SheetClose` (not the reverse): postxl Button has no forwardRef (React 18 ref warning).
- Keep the lib's `p-6` top padding (only `px-0`/`pb-[…]` override) — that is today's look.
- `SheetHeader` gets `pr-12`? No: titles are short and centred on phones; leave as today.

## Steps
1. **BottomSheet + test** — new `src/components/BottomSheet.tsx`, `src/components/BottomSheet.test.tsx`. Tests (render inside `<Sheet open>`):
   Note: vitest loads no Tailwind CSS (vite.config `test.css.include` is only theme/styles `?raw`), so the
   `hidden` selector has no effect in jsdom — test structure, not visibility:
   - `getByRole('dialog', { name: <title>, description: <description> })` (no jest-dom in this repo);
   - the ✕ named "Schließen" exists, class contains `size-10` and not `size-9` (AC2);
   - selector guard: `dialog.firstElementChild` is the lib `button` (text "Close") and `dialog.children[1]` is the
     "Schließen" button — catches a lib update that reorders children;
   - clicking "Schließen" calls `onOpenChange(false)`;
   - default wraps children in the scroll region (`overflow-y-auto`); `scroll={false}` renders children directly;
   - focus-on-open is NOT tested in jsdom (Radix focusFirst would pick the CSS-hidden lib button there);
     checked in the browser instead (W4 stays: no `onOpenAutoFocus`).
   Commit: `BottomSheet: shared phone sheet with 40 px "Schließen" close`.
2. **Rating** — `src/components/recipe/Rating.tsx`: replace the SheetContent block with `<BottomSheet title="Bewertung" description="Eigene Bewertung abgeben">…RatingDetails…</BottomSheet>`; drop now-unused imports (SheetContent, SheetHeader, SheetTitle, SheetDescription). Keep the "Modal, unlike TimerPanel" comment. `Rating.test.tsx:204`: click `{ name: 'Schließen' }` instead of `'Close'`.
   Commit: `Rating: phone sheet uses BottomSheet`.
3. **TimerPanel** — `src/timers/TimerPanel.tsx`: replace the SheetContent block with `<BottomSheet title="Timer" description="Küchen-Timer verwalten" scroll={false} __e2e_test_id__="timer-sheet" onInteractOutside={…} onCloseAutoFocus={…}>{body}</BottomSheet>`; root stays `<Sheet … modal={false}>`; drop unused imports. Add AppShell tests (phone viewport, AC3):
   - toast keep-open: open the sheet at `/recipes`, then flush DismissableLayer's deferred listener
     (`await act(() => new Promise((r) => setTimeout(r, 0)))`); mount a stub
     `<div data-sonner-toaster><button>Stopp</button></div>` OUTSIDE the sheet's React tree
     (`document.body.append`, removed in `try/finally`); `fireEvent.pointerDown` on it (default pointerType, not
     touch) → sheet stays open. Negative control in the same test: `pointerDown` on `document.body` → sheet closes.
   - non-modal regression guard: while open, `getByRole('button', { name: 'count 0' })` is found (no
     aria-hidden from hideOthers) and `document.body.style.pointerEvents !== 'none'`;
   - clicking "Schließen" closes the sheet and returns focus to the header "Timer" button (`await waitFor(...)`, Radix restores focus in a setTimeout);
   - existing "opens a sheet on the phone" test keeps asserting `data-test-id="timer-sheet"` (pass-through).
   Commit: `TimerPanel: phone sheet uses BottomSheet` (tests in the same commit).
4. **Plan doc** — copy this plan to `docs/superpowers/plans/2026-11-03-bottom-sheet.md` (repo convention, as in other pipeline PRs). Commit: `Docs: plan for shared BottomSheet`.
5. **Checks** — `npm run build`, `npm test -- --passWithNoTests`, `npm run format` then `npm run format:check`. Visual check at 375 px (Rating sheet + Timer sheet, light/dark): grip/title/spacing unchanged, ✕ top-right with 40 px target, focus ring visible. If formatting changed files, commit `Format`.

## AC verification
1. Both sheets render via BottomSheet — `rg "SheetHeader|SheetContent" src/timers/TimerPanel.tsx src/components/recipe/Rating.tsx` returns nothing, existing Rating/AppShell sheet tests green.
2. ✕ `aria-label="Schließen"`, ≥ 40 px — BottomSheet.test (class `size-10`, selector guard); browser check that the lib ✕ is gone and focus lands on "Schließen".
3. Timer non-modal + toast keep-open — new AppShell tests + existing tests.
4. CI — the three CI commands locally.

## Non-goals
Filter sheet (`side="right"`), new sheets, desktop Popover branches, reduced-motion gating of the lib slide.

## Review log
- Review pass 1 (fresh subagent): 2 blockers (no Tailwind CSS in vitest → visibility/focus tests of the hidden lib ✕ would fail), 2 major (toast test needs flushed DismissableLayer timer, outside-tree stub and negative control; non-modal guard should check pointer-events), minors (comment on asChild direction, keep p-6, plan copy to docs/superpowers/plans, explicit rg check for AC1). All applied; `pr-12` on the header rejected (short centred titles, would change the look).
- Review pass 2 (fresh subagent): no blocker/major; confirmed the toast/negative-control/non-modal/focus-return tests exercise the real code paths. Applied minors: `ComponentPropsWithoutRef`, `waitFor` for focus return, dialog `description` query instead of jest-dom, stub removal in try/finally, selector guard checks children[1] instead of the circular className check; spec W1 aligned.
