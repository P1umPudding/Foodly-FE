# Mockup-Angleich V5: Editor-Aufbau mit Seitenspalte, Status oben

Labels: agent-ready, alpha, ui, redesign · Teil von „Redesign Schritt 7“ · Hängt ab von: V1 (#227), V2 (#228) · Vor #217/#218 (gleiche Dateien)

### Context
Der Editor ist in der App eine einspaltige Formular-Karte mit Fußleiste „Änderungen werden automatisch gesichert / Fertig“. Das Mockup `#/editor` hat zwei Spalten: links die Rezept-Karte, rechts eine Seitenspalte (Bilder, Notizen, Quelle). Status und „Fertig“ stehen in der Kopfzeile.
Mockup: `docs/design/redesign/app.html` (lokal z. B. `python3 -m http.server` im Ordner, dann `app.html?theme=light|dark#/<screen>`), Spec `docs/design/redesign/README.md`, Werte in `base.css`/`dir-a.css`/`screens.css`. Bei Widerspruch gelten spätere Owner-Entscheidungen (`docs/design.md`, z. B. §7 Touch 40 px).

### Goal
Aufbau und Kopf des Editors (Desktop) wie im Mockup; Abschnitte folgen in V6 #232.

### Behaviour
- **Kopfzeile** (Slot aus V2 #228): Zurück, „Rezept bearbeiten“ bzw. „Neues Rezept“, rechts Speicher-Status („Gespeichert“ mit Häkchen / „Speichert …“ / Fehler) und „Fertig“ (primär). Die Fußleiste entfällt.
- **Layout ab 761 px:** Hauptspalte (Karte) + Seitenspalte ~280 px. Bis 760 px gestapelt: Bilder **über** der Hauptkarte, Notizen/Quelle danach.
- **Hauptkarte:** Titel (großes Feld, Vorschau der `{tag}`-Platzhalter bleibt darunter), Arbeitszeit/Gesamtzeit mit „min“ als Suffix im Feld, „Größe“ als Segment-Umschalter (Portionen/Freitext, Look aus V1 #227) mit Feldern und Hilfetext wie Mockup, Tags als **ein** Eingabefeld mit entfernbaren Tag-Chips und Platzhalter „Tag hinzufügen“.
- **Seitenspalte:** „Bilder“ (gestrichelte Fläche „Fotos hinzufügen · Das erste wird Hauptbild“, bestehende Bild-Logik), „Notizen“ (Feld + ⋯-Menü pro Notiz statt Pfeil-/Mülleimer-Knöpfen, „+ Notiz“), „Quelle“, Hinweis zu Kategorien/Teilen wie Mockup.
- Autosave-Verhalten unverändert.

### Präzisierungen (Designer-Review 13.11.)
- Handy: Status nur als Häkchen-Icon, Text „Gespeichert“ ausgeblendet.
- Hinweistexte wörtlich aus dem Mockup (Hilfetext „Größe“; Seitenspalte unten „Kategorien setzt du im Rezept über „+“ – gehört nicht zum Rezept selbst.“ — den Teilen-Halbsatz weglassen, solange es kein Teilen gibt).
- Mit Fotos: Hauptbild mit Badge „Hauptbild“, Galerie 4 Spalten, kleines +-Feld, Hinweis „Bild antippen: als Hauptbild setzen oder entfernen.“
- Menüpunkt heißt „Entfernen“, nicht „Löschen“.

### Acceptance criteria
1. Kein Element „Änderungen werden automatisch gesichert“ mehr im Inhalt; „Fertig“ und Status sind in der Kopfzeile (Test).
2. Größe-Umschalter wechselt Portionen/Freitext wie die heutigen Radios (bestehende Tests angepasst, grün).
3. Tag hinzufügen/entfernen im neuen Feld funktioniert per Tastatur (Test).
4. Notiz verschieben/löschen über das ⋯-Menü (Test).
5. Screenshots hell/dunkel, Desktop neben Mockup im PR; Handy darf vorerst gestapelt sein (Feinschliff in #217/#218).
6. Die lokalen Checks sind grün, alle fünf.

### Non-goals
Abschnitte, Zutaten, Schritte (V6 #232). Handy-Sheets (#217).

### Affected areas
`src/pages/RecipeEditor.tsx`, `src/components/editor/*`.

### Nachtrag Abgleich 13.11. (Mockup gilt, Befunde in `docs/design/redesign/audit/`)
- Kopf-Zustände (editor A4, A5): „Nicht gespeichert · Erneut versuchen“ und „Portionen prüfen“ im Kopf (Desktop mit Text, Handy mit Icon und erreichbarem Retry). Auf `/recipes/new` „Anlegen“ statt „Fertig“, „Verwerfen“ = Zurück. Lade-Skelett zweispaltig (B6).
- Tag-Vorschläge als Combobox direkt unter dem einen Tag-Feld, kein Popover mit eigener Suche (C10). Notizen als mehrzeilige Felder, Zeilen-Icon ⋮ (D5). Mehrere Fotos auf einmal hochladen (D4). Hilfetext „26 cm“ wie Mockup (C6).


## Comments

## Assumptions (worker)
A1 Header status: idle + saved -> check icon + "Gespeichert" (no time); saving -> spinner + "Speichert …"; error -> warning + "Nicht gespeichert" + outline button "Erneut versuchen" (phone: icon-only button with aria-label, >=40 px); size error -> "Portionen prüfen" (phone: icon + sr-only text). Error and size error may show together. Keep role=status live region and role=alert for errors. Phone: icon only, texts sr-only.
A2 /recipes/new: header shows "Anlegen" (primary) instead of "Fertig"; no save status. "Verwerfen" = the shell back arrow (no separate button). Create error shown as a toast (design.md §5). Leaving during the POST stays allowed. Tests relying on the footer "Verwerfen" link are adapted.
A3 Notes get a new note-only `RowMenu` (⋮, DropdownMenu: "Nach oben" / "Nach unten" / "Entfernen", disabled at ends). Shared `RowActions` stays untouched (used by ingredients/steps/sections = V6 #232). ⋮ (Nachtrag D5) wins over "⋯". Notes become multi-line textareas; button "+ Notiz".
A4 Image tap: each image is a button opening a DropdownMenu ("Als Hauptbild", "Entfernen"); main image only "Entfernen". Main image shows a "Hauptbild" badge, gallery 4 columns, small + tile, hint "Bild antippen: als Hauptbild setzen oder entfernen.". Empty state: dashed area "Fotos hinzufügen · Das erste wird Hauptbild".
A5 Multi-upload: `multiple` input, files uploaded sequentially in selection order via existing single-file `foodly.uploadImage`, state updated per success (no stale props); first becomes main if none set; one toast per failure, successes kept. No API change.
A6 Layout rendered once (no duplicated ImageManager); CSS grid with areas/order: >=761 px main + ~280 px sidebar (sticky), <=760 px images above main card, notes/source after. Page width per mockup (max ~1080 px). Phone header fit/tab bar = #217/#218.
A7 Tag field = combobox: typing filters existing tags (no tag creation, select-only), list directly under the input; ArrowUp/Down + Enter adds, Escape closes, Backspace in empty input removes last chip; each chip has a focusable ✕ button "<Tag> entfernen". Chip keeps tag icon.
A8 Size segment items keep role=radio (root role=group) (Portionen / Freitext); help texts and "26 cm" literal from mockup (placeholder too).
A9 Loading skeleton two-column (B6). Error/no-access/not-found pages left as is; no header actions there.
A10 Header actions via existing `HeaderActions` slot from #228; header test renders via the route/AppShell. Remove footer leftovers (pb-28, shell comment).
A11 Sidebar bottom hint: "Kategorien setzt du im Rezept über „+“ – gehört nicht zum Rezept selbst." (no sharing half-sentence).

## Spec review
- 2026-11-14: fresh reviewer subagent: 0 blocker, 7 major, 9 minor. All closable with conservative assumptions (A1–A11) — no backend/API change, one PR plausible but large (risk: tag combobox, image menu + multi-upload). Decision (a): continue without dispatcher questions.
