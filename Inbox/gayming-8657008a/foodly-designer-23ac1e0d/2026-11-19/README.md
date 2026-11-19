# Abgleich App ↔ Mockup, 19.11.2026

Stand: `main` @ df62980, Mock-Modus (`VITE_MOCK=1`), Mockup `app.html?theme=…&img=1#/<screen>`.
Desktop 1280 × 820, Handy 390 × 844, hell und dunkel. Jedes Bild: **links Mockup, rechts App**.
Die App-Mockdaten haben fast keine Fotos und andere Rezepte. Unterschiede, die nur aus den Daten kommen, sind nicht gelistet.

## Abweichungen, nach Gewicht

| # | Screen | Was abweicht | Bild | Fix-Vorschlag |
|---|---|---|---|---|
| 1 | Koch-Modus | Desktop ohne Zutaten-Spalte, Handy ohne Knopf „Zutaten“ (Sheet), kein „Dafür“-Chip unter dem Schritt | `cook-desk-light`, `cook4-phone-light` | ist schon in **#210** |
| 2 | Detail, Handy | Zwei zusätzliche Icon-Knöpfe (Abhaken, Tasse/Wach halten) neben „Portionen“ brechen in eine zweite Zeile um. Im Mockup steht dort nur Stepper + „Kochen“ in einer Zeile | `detail-phone-light` | Auf dem Handy die beiden Schalter ins ⋯-Menü der Kopfzeile (als Checkbox-Einträge). Desktop bleibt, wie er ist. Die Aktionszeile muss bei 390 px einzeilig bleiben |
| 3 | Editor | Aktives Segment „Portionen / Freitext“ ist kaum sichtbar: berechnet `bg-accent` (oklch 0,955) statt `bg-card` (#fff) auf der Spur 0,94. Der Ansichtsschalter in der Liste ist richtig | `editor-desk-light`, `editor-phone-light` | `SizeField.tsx`: dieselben Klassen wie `Segment.tsx`/`ViewToggles` nutzen, damit `data-[state=on]:bg-accent` von postxl nicht gewinnt. Test: aktives Item hat `bg-card` |
| 4 | Start | „Geteilt mit dir“: Zeilen ohne Vorschaubild. Mockup: 36-px-Thumb, ohne Foto mit Platzhalter-Icon (wie die Listenzeile) | `home-desk-light`, `homefull-phone-light` | `SharedWithYou`: Thumb `sm` aus der Rezeptzeile wiederverwenden, Titel + „von <Name>“ rechts davon |
| 5 | Detail, Handy-Kopf | Stift „Bearbeiten“ hat einen Rahmen (outline). Im Mockup ist er ghost wie „Teilen“ | `detail-phone-light` | `variant="ghost" size="icon"` |
| 6 | Profil | Kopf ohne Untertitel (Mockup „42 Rezepte · 2 Gruppen“) | `profile-desk-light`, `profile-phone-dark` | „N Rezepte“, nur wenn die Zahl ohne eigenen Request da ist. Sonst weglassen. Abschnitte „Kochen“/„Offline“ erst mit ihren Features (Wach halten bleibt auf der Rezeptseite, Daniel 15.11.) |
| 7 | Detail | Kategorie-Chip ohne Symbol zeigt nichts. Start-Kachel, Kategorie-Kopf und `/categories` zeigen den Anfangsbuchstaben | `detail-desk-light` | Chip nimmt denselben Fallback (Buchstabe) wie die Kachel. Eine Regel für alle Kategorie-Marken |
| 8 | /categories | Ziehgriffe zum Sortieren fehlen (Mockup ⋮⋮ links) | `categories-desk-light` | Produktfrage: Reihenfolge per Drag, braucht Backend-Feld. Bis dahin ohne Griff, so wie jetzt |

## Schon erfasst
#210 Koch-Modus Zutaten/Größe/Abhaken · #250 „Zuletzt bearbeitet“ statt „Zuletzt erstellt“ · #299 Überlauf Start 390 px

## Bewusst anders, kein Issue
Planer/Einkauf/Gruppen und „Heute geplant“ fehlen (nur echte Ziele). „5 Rezepte“ statt „5 von 14“ (B16).
Die Liste blendet Thumbs aus, wenn kein Treffer ein Foto hat (`rowData.ts`). Touch-Flächen 40 px machen Suche und Filterknöpfe am Handy höher (§7).
Platzhalter „Rezept suchen“: Die Suche findet keine Zutaten, dafür gibt es den Zutaten-Filter.
Kacheln in der gruppierten Liste zeigen nur die *anderen* Kategorien. Das Mockup ist hier selbst uneinheitlich, die App folgt der Detail-Liste.
Hell/Dunkel: keine themenspezifischen Abweichungen gefunden.

## Vorschlag design.md (Nachtrag #246)
1. **§2 Schrift, Zeile Wortmarke** ersetzen:
   `Brand` (`src/components/shell/BrandMark.tsx`) | 17 / 700, Laufweite −0,02em | Wortmarke in Seitenleiste, Handy-Kopf auf Start, Login/Registrierung. Nur dort (Mockup `.brand`).
   Grund: Die heutige Zeile „`text-xl font-display` 18/650“ widerspricht dem Code seit #246.
2. **§2 Schrift, Ausnahmen** ergänzen: Tab-Leiste (`TabBar`): Label 11 px / 500, Icon 22 px. Inaktiv `text-muted-foreground` (nicht Mockup-`subtle`, wegen AA), aktiv `text-foreground`. Nur dort.
3. **§2 Farben, Zeile `text-subtle-foreground`** ergänzen: Ausnahmen für kleinen Text, vom Owner per Mockup bestätigt: Kopf „Kategorien“ in der Seitenleiste (12/600, #246) und das Datum auf Start (13/500, #242). Keine weiteren. Ein neuer Fall braucht einen design.md-PR.
