# Plan: Ref-Warnung bei Tooltip + Dropdown-Trigger beheben (#269)

Spec: `.git/agent-work/spec.md` (Annahmen A1–A6). Ursache: Die postxl-`DropdownMenuTrigger` (`node_modules/@postxl/ui-components/dist/index.js:1681`) ist eine reine Funktionskomponente ohne `forwardRef`. Steht sie als Kind von `TooltipTrigger asChild`, hängt der Slot des Tooltips seinen Ref an sie, und React warnt. Der Tooltip-Anker bleibt `null`.

Lösung (kleinste Änderung, nur App-Code, keine neue Abhängigkeit): **Verschachtelung umdrehen** zu
`<DropdownMenuTrigger asChild><TooltipTrigger asChild><TriggerButton ref=…>`.
Die äußere postxl-Funktion bekommt dann keinen Ref mehr; ihr Radix-`DropdownMenu.Trigger` reicht seinen Ref und die Handler per Slot an den Radix-`TooltipTrigger` (`forwardRef`) weiter, und der setzt beide zusammen auf den `TriggerButton`. Danach erreichen alle drei Refs den Button: Menü, Tooltip und den eigenen `moreTrigger` bzw. `menuTriggers`. Die Handler werden per Slot zusammengeführt: Hover/Fokus öffnen den Tooltip, Klick/Enter das Menü wie bisher. Optik bleibt gleich (dasselbe eine `<button>`). Zwei kleine, bewusst hingenommene Unterschiede (im PR nennen): (a) `data-state` am Button zeigt jetzt den Menüzustand (`open`/`closed`) statt des Tooltipzustands; kein Style und kein Test hängt daran (gegrept). (b) Der `onPointerDown` des Menüs ruft `preventDefault()` auf, deshalb überspringt der Tooltip sein eigenes Schließen beim Pointerdown und schließt erst beim `click` (`onClick → onClose`), einen Bruchteil später. Das ist am Ende des Klicks kein sichtbarer Unterschied, wird aber getestet (Menü offen ⇒ kein Tooltip).

Verworfen: ein eigener `forwardRef`-Wrapper um `DropdownMenuPrimitive.Trigger`. Er bräuchte `@radix-ui/react-dropdown-menu` als direkte Abhängigkeit, und postxl exportiert das Primitive nicht.

## Schritt 1 – Test zuerst (rot)
Neue Datei `src/pages/triggerRefs.test.tsx`, nur nach dem Muster von `Categories.mock.test.tsx` (`vi.stubEnv('VITE_MOCK','1')` + `vi.resetModules()` + echte `<App/>` im `MemoryRouter`, `SLOW`-Timeouts). Kein `vi.mock` von `CatalogProvider`/`react-router-dom`/`Link`, kein Mix mit anderen Mustern. **Kein `vi.restoreAllMocks()` in `afterEach`** (würde den Spy entfernen), nur `vi.unstubAllEnvs()`. Der Spy wird in `afterAll` per `mockRestore()` zurückgesetzt.
- **Warn-once:** react-dom merkt sich die Warnung pro JSX-Quellzeile (`didWarnAboutFunctionRefs`), modulweit; `resetModules` setzt das nicht zurück. Deshalb: ein `console.error`-Spy, der nur die Ref-Warnung schluckt und alles andere an die echte Konsole weiterreicht, **einmal in `beforeAll`**; jeder Routen-Test merkt sich zu Beginn `n = spy.mock.calls.length`, rendert, wartet auf den Auslöser und prüft `refWarnings(n)` (Aufrufe ab `n`, deren erstes Argument „cannot be given refs“ enthält) `toEqual([])`. Bei Fehlschlag stehen Meldung und Stack im Diff. Die drei Stellen liegen auf verschiedenen Zeilen und werden je zuerst im eigenen Routen-Test gerendert, deshalb unabhängig von `-t`. Die Routen-Tests stehen in der Datei **vor** den Verhaltenstests.
- Routen: `/recipes/:id` (eigenes Rezept von Nutzer 1), `/categories`, `/categories/:id`, Regression `/recipes/new`, `/recipes/:id/edit` (A1). Kein Dialog wird geöffnet (postxl-`DialogOverlay`, A5).
- Verhalten (AC2), je Seite mit ⋯ (RecipeDetail, Categories, CategoryPage):
  - Fokus auf den Auslöser → `findByRole('tooltip')` mit „Weitere Aktionen“ bzw. „Aktionen“ (Fokus öffnet ohne Verzögerung; Hover wegen der 700-ms-Provider-Verzögerung nicht nötig).
  - `pointerDown` + `click` → `role="menu"` offen und kein `tooltip` mehr (der Tooltip schließt jetzt beim click).
  - Escape auf ⋯ für RecipeDetail und CategoryPage neu: Öffnen per `keyDown Enter`, `keyDown Escape` auf dem Menü, `waitFor` → `document.activeElement` ist der Auslöser. Categories ist schon durch `Categories.mock.test.tsx:349` abgedeckt.
- Rotphase belegen: vor dem Fix laufen lassen; die Routen-Tests für RecipeDetail, Categories und CategoryPage schlagen **jeweils** fehl, die Editor-Tests sind grün.

## Schritt 2 – Verschachtelung umdrehen (grün)
- `src/pages/RecipeDetail.tsx` (~171–183), `src/pages/CategoryPage.tsx` (~148–160), `src/pages/Categories.tsx` (~223–238): `TooltipTrigger asChild` und `DropdownMenuTrigger asChild` tauschen, Kinder/Props unverändert.
- Je ein gleichlautender Kommentar: `{/* Menu trigger outside: postxl's DropdownMenuTrigger doesn't forward refs, so it can't sit under TooltipTrigger asChild. */}`.
- Lauf: neue Testdatei grün, dazu `Categories*.test.tsx`, `CategoryPage*.test.tsx`, `RecipeDetail*.test.tsx`, `App.pageTitle.test.tsx`, `catalog/categoriesFreshness.rest.test.tsx`.
- Commit mit Plan-Dokument (`docs/superpowers/plans/2026-11-16-ref-warnung-trigger.md` = dieser Plan, Konvention wie #277/#278), Test und Fix: `Ref-Warnung bei Tooltip- und Dropdown-Trigger beheben (#269)`, ohne AI-Trailer.

## Schritt 3 – Abschluss
- `npm run build`, `npm test -- --passWithNoTests`, `npm run format`, `npm run format:check`, `npm run lint` (ohne neue Suppressions).
- Prüfung im Test-Log: `grep "cannot be given refs" -A3 | grep DropdownMenuTrigger` → 0 Treffer.
- Sichtprüfung: Dev-Server im Mock-Modus (`VITE_MOCK=1`), `/recipes/2`, `/categories`, `/categories/:id`, `/recipes/new`: Konsole ohne die Warnung; Tooltip erscheint am ⋯, Menü öffnet und schließt, Escape führt den Fokus zurück. Wenn kein Chrome-MCP verfügbar ist, steht das im PR (keine sichtbare Änderung, Screenshots laut Spec nicht nötig).
- Im PR als Follow-up nennen (A5): postxl-`DialogContent` → `DialogOverlay` ohne `forwardRef` löst beim Öffnen von Dialogen dieselbe Warnung aus (postxl-intern).

## Abdeckung der Akzeptanzkriterien
| AC | Nachweis |
|----|----------|
| 1 keine Warnung auf den 5 Routen | `triggerRefs.test.tsx` (Spy vor dem ersten Render) + Konsole im Dev-Server |
| 2 Tooltip/Menü/Fokus wie vorher | Tooltip bei Fokus, Menü öffnet und Tooltip weg (neu); Escape-Fokus (neu für RecipeDetail/CategoryPage, bestehend für Categories) + Sichtprüfung |
| 3 keine Änderungen an node_modules/postxl | Diff enthält nur `src/` + Plan-Dokument |
| 4 fünf Checks grün | Schritt 3 |

## Review-Log
- Review pass 1 (frischer Subagent, 2026-11-16): kein Blocker. Major: (1) Tooltip schließt nach dem Tausch erst beim click, nicht beim pointerdown → dokumentiert + Test „Menü offen ⇒ kein Tooltip“; (2) React-Warn-once macht Einzeltests unzuverlässig → Spy in `beforeAll`, Sammelassertion am Ende, Rotphase für alle drei Seiten belegen; (3) Mock-Muster nicht mischbar → nur Categories.mock-Muster mit echter App. Minor übernommen: kein fragiler Stack-Filter, sondern null Meldungen; `data-state`-Unterschied benannt; doppelter Escape-Test gestrichen; einheitlicher Einzeiler-Kommentar; Plan-Doc im selben Commit.
- Review pass 2 (frischer Subagent, 2026-11-16): kein Blocker. Major: (1) die Escape-Abdeckung war falsch behauptet (CategoryPage-Test betrifft das Sortiermenü, RecipeDetail den Dialog) → Escape auf ⋯ für beide neu; (2) `restoreAllMocks` im kopierten Muster entfernt den Spy → weggelassen; (3) die Sammelassertion lief bei `-t` gar nicht → Delta je Routen-Test. Minor: Rotphase je Route belegen, Tooltip per Fokus statt Hover (Verzögerung), Meldungen im Fehlertext; Nit: `data-state`-Grep (nur FilterButton, nicht betroffen) in den PR.
- Code-Review Runde 1 und 2 (frische Subagenten): kein Blocker/Major. Umgesetzt: Kommentartext präzisiert, Spy reicht andere `console.error` durch, Schrittnummern im Plan, Test prüft `aria-describedby` des Auslösers gegen die Tooltip-ID (a11y-Verknüpfung; den Fehler selbst fangen die Routen-Tests).
