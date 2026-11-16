# Plan: Lightbox wie im Mockup (#248)

Spec: `.git/agent-work/spec.md` (Annahmen A1–A9). Mockup: `docs/design/redesign/screens.css:2415-2520`, `app.js:600-612`.
Nur `src/components/recipe/Lightbox.tsx` (+ Tests, Doku). Kein neues Bauteil, keine API-Änderung, `RecipeDetail.tsx` unverändert.

## Schritt 1 – Plan-Dokument
- `docs/superpowers/plans/2026-11-16-lightbox-mockup.md` = dieser Plan (Konvention, wie PR #277).
- Commit: `Plan: Lightbox wie im Mockup (#248)`

## Schritt 2 – Lightbox.tsx neu aufbauen (Struktur/Look)
Ersetzt das heutige Layout; Verhalten (Tastatur, Scroll-Sperre, Strip-Scroll) bleibt.

- **Kommentare:** Dateikopf („image, caption, controls …“) und „always 50vh“-Kommentar an das neue Layout anpassen.
- **Entfernen:** `computeFit`, `fit`-State, `imgRef`, Resize-Listener, die große Bildunterschrift (A1).
- **Dialog** (Portal, `role="dialog" aria-modal aria-label="Fotos"`, `onClick={onClose}`, `cursor-zoom-out`):
  `fixed inset-0 z-[100] flex flex-col bg-[oklch(0.12_0_0)] text-white` (deckend, kein Blur; bewusst fest dunkel in beiden Themes wie das Mockup).
- **Kopfleiste** `flex h-14 shrink-0 items-center justify-between pl-5 pr-3`:
  - Zähler `<span onClick={stop} className="cursor-default text-sm tabular-nums text-white/75">{index+1} / {n}</span>` – immer, auch „1 / 1“ (A4). `text-sm` = 13 px Token, kein Hand-Sizing.
  - Nach `npm ci`: postxl `buttonVariants` ghost auf `dark:hover:*` prüfen; falls vorhanden `dark:hover:bg-white/20 dark:hover:text-white` in `ctrl` ergänzen.
  - ✕: postxl `Button variant="ghost" size="icon"`, `aria-label="Schließen"`, Klasse `ctrl` = `size-10 rounded-md bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/60` + `FOCUS_RING`; Icon `size-5`.
- **Bühne** `relative grid min-h-0 flex-1 touch-none place-items-center px-[72px] phone:px-0` mit Pointer-Handlern (Schritt 3).
  - Bild: `RecipeImage` `className="max-h-[calc(100dvh-140px)] max-w-full cursor-default rounded-md object-contain phone:rounded-none"`, `onClick={stop}`, Wie Mockup nur Max-Maße, kein Hochskalieren kleiner Bilder; `dvh` statt `vh`, damit auf dem Handy die Browserleiste nicht abschneidet.
  - Fallback: `fallbackClassName="h-[calc(100dvh-140px)] w-full max-w-4xl cursor-default rounded-md phone:max-w-none phone:rounded-none bg-white/10 text-white/40"` (A7; heller `bg-muted` stäche auf der festen dunklen Bühne heraus).
  - Pfeile nur bei `n > 1`: `absolute left-4|right-4 top-1/2 -translate-y-1/2 phone:hidden` + `ctrl`, Icons `size-5`, Labels bleiben „Vorheriges/Nächstes Bild“ (A9).
- **Vorschaubilder** nur bei `n > 1`, Strip `ref={stripRef} onClick={stop}`:
  `relative flex shrink-0 cursor-default gap-1.5 overflow-x-auto p-3.5 [scrollbar-width:none]`; zentriert ohne Clipping beim Überlauf über `[&>:first-child]:ms-auto [&>:last-child]:me-auto` (statt `justify-center`, das links abschneidet).
  - Kachel `TriggerButton variant="bare"`: `size-14 phone:size-11 shrink-0 overflow-hidden rounded-md border-2 border-transparent opacity-55 transition-opacity hover:opacity-100 focus-visible:opacity-100` + Fokus `focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.12_0_0)]` (Fokus hebt die Abdunklung auf, sonst würde der Ring mit 55 % unter 3:1 fallen); aktiv: `border-white`, `opacity-55`/hover/focus-Opacity nur an inaktiven Kacheln (bedingt per `cn`, kein Override nötig). Dunkles Overlay-`span` entfällt (A8). `aria-label`, `aria-current` bleiben.
  - Fokusring vs. Auswahl: Auswahl ist jetzt ein Rand (border), der Fokus ein Ring mit Abstand → klar unterscheidbar; `focus-visible:ring-white` am aktiven entfällt.
- `focusRing.test.ts:179` und `:188` Kommentare prüfen/anpassen (Auswahl ist kein `ring-2 ring-white` mehr); Zeile 204 testet nur die Hilfsfunktion, bleibt.

## Schritt 3 – Wischen (A3)
In Lightbox.tsx, kein neuer Hook (eine Stelle):
- `swipeStart = useRef<{ id: number; x: number; y: number } | null>(null)`, `swiped = useRef(false)`.
- `onPointerDown` (Bühne): `swiped.current = false` (ein Wisch ohne Folge-Klick darf den nächsten Tipp nicht schlucken); nur `pointerType !== 'mouse'` und `n > 1` → Start merken.
- `onPointerUp`: gleiche `pointerId`; `dx`, `dy`; wenn `|dx| >= 50 && |dx| > |dy|` → `go(dx < 0 ? 1 : -1)`, `swiped.current = true`. Start zurücksetzen.
- `onPointerCancel`: Start zurücksetzen.
- `onClickCapture` (Bühne): wenn `swiped.current` → `stopPropagation()` + zurücksetzen, damit ein nachfolgender Klick nicht schließt.
- `touch-none` auf der Bühne: sonst bricht der Browser die Geste mit `pointercancel` ab. Kommentar: `touch-none` verhindert nur `pointercancel`; Zoom war durch die `touchmove`-Sperre schon vorher aus.
- `onPointerDown` ignoriert `!e.isPrimary` und einen laufenden Wisch (zweiter Finger überschreibt den Start nicht).
- Fenster-`touchmove`-Sperre: Ereignisse im Vorschaubild-Streifen durchlassen (`stripRef.current?.contains(e.target)`), sonst lässt sich der Streifen auf dem Handy (ohne Pfeile die einzige Direktwahl) nicht mit dem Finger scrollen. Test: touchmove im Streifen nicht `defaultPrevented`, auf der Bühne schon. Fenster-`touchmove`-Sperre bleibt.
- Kommentar (warum): Schwelle, Maus ausgenommen (Klick auf Bühne schließt weiter), `touch-none`.

## Schritt 4 – Tests (`Lightbox.test.tsx`)
- jsdom 29 hat `PointerEvent` vermutlich (seit v22.1): nach `npm ci` prüfen; nur falls nicht, im Testfile minimal polyfillen (`class extends MouseEvent` mit `pointerId`, `pointerType`), damit `clientX` ankommt.
- AC1: `render(index=1, 6 Bilder)` → `getByText('2 / 6')`, Button „Schließen“; Dialog `getByRole('dialog', { name: 'Fotos' })`; keine große Bildunterschrift (Text „Bild 2“ nur als alt/aria-label, kein sichtbarer Text).
- n=1: „1 / 1“, keine Pfeile, keine Vorschaubilder.
- AC2 Wischen: touch links (dx −80) → `onIndexChange(next)`; rechts → prev; mit Umlauf; dx 30 → nichts; vertikal (dx 60, dy 90) → nichts; `pointerType: 'mouse'` → nichts; Wisch schließt nicht (`onClose` nicht aufgerufen, auch bei folgendem click); `pointercancel` → nichts.
- Handy-Klassen: eine Stichprobe genügt (Pfeile tragen `phone:hidden`).
- Vorschaubilder: alte Ring-Assertions (`ring-2`, `focus-visible:ring-white`, `not.toContain('ring-white')`) entfernen; inaktiv `opacity-55` + `focus-visible:opacity-100`, aktiv ohne `opacity-55`, mit `border-white` + `opacity-100`; Fokus-Test anpassen (kein `ring-2 ring-white` mehr am aktiven).
- Fallback-Test: Klasse `h-[calc(100dvh-140px)]` statt `h-[64vh]`.
- Klick auf leere Bühne / Kopfleiste schließt; Klick aufs Bild, Zähler, Strip nicht.
- AC3: bestehende Tastatur-Tests unverändert grün.
- `RecipeDetail.images.test.tsx`, `RecipeImages.test.tsx`, `RecipeDetail.head.test.tsx` mitlaufen lassen (nutzt die Lightbox).
- Commit: `Lightbox wie im Mockup: deckend, Zähler oben, Pfeile am Rand, Wischen (#248)` (Schritte 2–4 zusammen, ein fachlicher Commit).

## Schritt 5 – Doku
- `docs/design/redesign/audit/detail.md` B1–B4 Spalte „Abgedeckt“ → `#248`.
- `docs/design/redesign/README.md:127-129`: „Entspricht dem heutigen `Lightbox.tsx`“ bleibt sinngemäß; ggf. „(seit #248)“.
- `docs/qa/checklist.md:33`: „Lightbox (Zähler, Pfeile, Escape, Thumbnails; Handy: Wischen, keine Pfeile)“.
- Commit: `Doku: Lightbox-Abgleich (#248)`

## Commits
Kein `Co-Authored-By`- oder sonstiger KI-Trailer (CLAUDE.md geht dem Harness-Hinweis vor).

## Schritt 6 – Checks
`npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format` → `format:check`, `npm run lint`. Vor quality-check/PR: rebase auf `origin/main` (Dispatcher-Hinweis). Keine `*.conflict.*`-Dateien committen.

## Abnahme
| AC | Nachweis |
|---|---|
| 1 Zähler + ✕ | Test „2 / 6“, Schließen-Button |
| 2 Wischen | Pointer-Event-Tests |
| 3 Tastatur | bestehende Tests grün |
| 4 Screenshots | kein Browser in der Worker-Umgebung → im PR offen mit Anleitung (`VITE_MOCK=1 npm run dev`, Mockup `app.html?…&lb=1#/detail…`) |
| 5 Checks | alle fünf lokal |

## Review-Log
- Review pass 1 (frischer Subagent): 0 blocker, 2 major (Wisch-Flag schluckt nächsten Tipp → Reset in pointerdown + Test; Fokusring mit Abdunklung zu schwach → focus-visible:opacity-100), 5 minor, 5 nit. Übernommen: beide major, touch-none-Trade-off dokumentiert, Polyfill nur bei Bedarf, alte Kommentare, Ring-Offset-Farbe, weniger Klassen-Tests, kein Trailer. Nicht übernommen: setPointerCapture (jsdom-Lücke, pointerId-Prüfung reicht), justify-center-safe (Trick reicht). AC4: Dispatcher im Handoff/PR deutlich informieren.
- Review pass 2 (frischer Subagent): 0 blocker, 0 major, 5 minor, 4 nit. Übernommen: isPrimary/laufender Wisch, Streifen per Finger scrollbar (touchmove-Ausnahme + Test), touch-none-Kommentar korrigiert, weitere Testdateien, ghost-dark-hover prüfen, Fallback-Farbe, `relative` am Streifen, Test-Altlasten, draggable gestrichen.
