# Plan #307 — Tippflächen-Nachzügler auf Touch

Technique as #292: add `touch:` (= `@media (pointer: coarse)`) classes only; mouse classes unchanged. Tests = class-token assertions (mouse class present, touch class present, no unconditional 40 px class).

## Steps
1. **AC1 Theme switch** – `src/components/ThemeMenu.tsx` `ThemeSegment`: `itemClassName="h-8 gap-1.5"` → `"h-8 gap-1.5 touch:h-10"`. Shared `Segment` untouched.
   Test: `src/components/ThemeMenu.test.tsx` – the three items (`getAllByRole('radio')`, Radix ToggleGroup) of ThemeSegment carry `h-8` and `touch:h-10`, not `h-10`.
2. **AC2 Login/Register link** – `src/components/auth/AuthCard.tsx` `AuthLink`: `touch:-my-2.5 touch:py-2.5` → `touch:-my-[11px] touch:py-[11px]` (18 px line height of `text-sm` + 22 = 40). Fix the comment (says 20 px). Covers Login footer, Register footer and Register's email-error note link.
   Test: update `src/pages/Login.test.tsx` (replace old tokens with `touch:py-[11px]`, `touch:-my-[11px]`, `touch:inline-block`; assert no unconditional `py-2.5`); add the same assertion for the footer "Anmelden" link in `src/pages/Register.test.tsx` (query before any email-taken note, else two "Anmelden" links); in the existing 409 test also assert the note link carries `touch:py-[11px]`.
3. **AC3 Duration input** – `src/components/list/filters/DurationFilter.tsx` NumberInput `wrapperClassName`: `touch:min-h-10` → `touch:min-h-[42px]` (wrapper is bordered; inner `<input>` = min-h-full = 42 − 2 = 40). Comment like FilterButton in #292: "Touch: 42 px so the input inside the 1 px border is 40 px (design.md §7)". `phone:min-h-10` unchanged (non-goal).
   Test: `DurationFilter.test.tsx` – the input's parent carries `min-h-8` and `touch:min-h-[42px]`.
4. **AC4 Collapsed sidebar** – `src/components/shell/Sidebar.tsx` `<aside>`: when `collapsed`, add `touch:pr-[11px]` (64 px rail − 12 left − 11 right − 1 border = 40 px content width). Rail width / `--shell-left` unchanged. Applies to nav entries, "Neues Rezept" and categories in the rail (all `w-full`). Short comment.
   Write as `collapsed && 'touch:pr-[11px]'` in the aside's `cn()`; one-line why (64 − 12 − 11 − 1 = 40; inset cancels).
   Test: `AppShell.test.tsx` (already collapses via "Seitenleiste einklappen" and reads `sidebar().className`) – collapsed: `pr-3` + `touch:pr-[11px]`; expanded: no `touch:pr-[11px]`.
5. **AC5 Cook mode ✕** – `src/pages/CookMode.tsx` closeButton: `className="-ml-2"` → `"-ml-2 touch:size-10"`.
   Also `src/components/CookSkeleton.tsx` (✕ stand-in `-ml-2 size-9`): add `touch:size-10` so the header doesn't jump 4 px after loading (deliberate match, like AuthCardSkeleton's `touch:h-10`).
   Test: `CookMode.test.tsx` – button "Koch-Modus beenden" has `touch:size-10`, not `size-10` unconditional.
6. **Plan doc** – copy this plan (including review log, like existing plans) to `docs/superpowers/plans/2026-11-23-tippflaechen-nachzuegler.md` (CLAUDE.md: pipeline plans live there).
7. **Checks** – all five: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`. Visual check: Chrome MCP not available here → PR lists computed sizes per spot, plus side effects (Profile theme row +8 px, Cook header +4 px, duration field 42 px vs presets 40 px on touch).

## Commits
1. "Plan: Tippflächen-Nachzügler auf Touch (#307)" (docs/superpowers/plans).
2. "Tippflächen-Nachzügler auf Touch: Theme, Anmelde-Link, Arbeitszeit, Seitenleiste, Koch-✕ (#307)" (code + tests).
No AI trailer (CLAUDE.md overrides harness default).

## Review log
- Review pass 1 (fresh subagent): 0 blocker; 1 major (plan belongs in docs/superpowers/plans → added step 6 + commit 1); minors applied (sidebar test in AppShell.test.tsx, conditional class, Register query order, Login test tokens, ThemeSegment items are radios, comment wording, five checks, side effects in PR). Arithmetic for all five spots confirmed incl. twMerge and safe-area inset.
- Review pass 2 (fresh subagent): 0 blocker, 0 major; test feasibility and no-break confirmed (only Login.test:53 asserts old tokens). Applied: keep review log in docs copy, CookSkeleton ✕ stand-in gets `touch:size-10`, em dash in title, 409 note-link assertion.
