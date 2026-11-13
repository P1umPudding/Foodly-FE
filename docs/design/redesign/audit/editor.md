# Audit „editor“: Rezept-Editor App vs. Mockup `#/editor`

Basis: App `main` dda7820 (`/recipes/1/edit` mit Fotos, `/recipes/4/edit` ohne Fotos, `/recipes/new`), Mockup `app.html#/editor` (`img=1`, `img=0`, `sheet=ing`), Desktop 1440 und Handy 390, hell und dunkel.
Screenshots und Skripte: (lokale Screenshots, nicht im Repo) (`app-*`, `mock-*`, `st-*` = geöffnete Zustände der App).
Spec: `app.js` 717–804 (`S.editor`), `screens.css` 615–760, 1037–1100 (Handy), 1753–1875 (Runde 2), 1979–2007 (Handy, Runde 2), README §3.3.
App: `src/pages/RecipeEditor.tsx`, `src/components/editor/{BasicsCard,SizeField,TagPicker,SaveStatus,SectionEditor,IngredientRow,IngredientPicker,RowActions,StepRow,ImageManager}.tsx`, Shell `src/components/shell/AppShell.tsx`.

Hell und dunkel unterscheiden sich in App und Mockup nur über die Tokens. Ich habe keinen Unterschied gefunden, der nur in einem der beiden Themes auftritt. Alle Befunde gelten also für beide Themes.

Das Mockup hat **keine** Spezifikation für: `{tag}`-Vorschau, Tag-/Icon-Picker zum Einfügen von `{tagId}`, Vorschlagsliste der Tags, Aufklappliste der Zutatensuche, geöffnetes Zeilenmenü, Validierung, die Zustände „Speichert …“ und Fehler, Laden sowie „Neues Rezept“. Wo die App dort etwas zeigt, steht es unten nur, wenn es mit dem Mockup-Aufbau kollidiert. Einen Picker zum Einfügen von `{tagId}` gibt es weder in der App noch im Mockup.

---

## A. Kopfzeile, Status, Fertig

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| A1 | Editor · Desktop + Handy | Kopf: Zurück-Pfeil (`chevron-left`, `data-act="back:detail"`), Titel „Rezept bearbeiten“ (`shell(... back:'detail')`, app.js 797–801) | Kein Zurück-Knopf, nur der Titel aus `routeTitle()` (`AppShell.tsx`) | Struktur | #231 |
| A2 | Editor · Desktop | Rechts im Kopf: `.saved` („circle-check“ + „Gespeichert“, 13 px, `--fg-subtle`, screens.css 753) und `btn primary` „Fertig“, dann der Timer | Status und „Fertig“ in einer festen Fußleiste (`RecipeEditor.tsx`, `fixed … bottom-[var(--shell-bottom)]`). Text „Änderungen werden automatisch gesichert“ bzw. „Automatisch gesichert 16:52“ | Struktur/Text | #231 |
| A3 | Editor · Handy | Kopf: ‹, Titel (abgeschnitten „Rezept bearbei…“), nur das Häkchen-Icon (`hide-m` auf dem Text), „Fertig“, Timer | Fußleiste über der Tab-Leiste, zweizeiliger Status-Text | Struktur | #231 (Präzisierung) / #218 |
| A4 | Editor · Speichern fehlgeschlagen / Portionen ungültig | – (das Mockup zeigt nur „Gespeichert“) | Fußleiste zeigt „Nicht gespeichert“ + Knopf „Erneut versuchen“ bzw. „⚠ Nicht gespeichert – Portionen prüfen“, „Fertig“ ausgegraut (`st-sizeerr-d.png`) | Verhalten | **NEU**: #231 nennt nur „Fehler“ im Kopf. Offen ist, wie „Erneut versuchen“ und der Portionen-Hinweis in den Kopf passen, besonders auf dem Handy, wo nur ein Icon Platz hat. |
| A5 | Neues Rezept · Desktop + Handy | – (kein eigener Screen; laut #231 Titel „Neues Rezept“) | Fußleiste mit „Verwerfen“ (Link) und „Anlegen“ (primär, deaktiviert ohne Titel, mit Spinner), daneben ggf. Fehlertext | Struktur | **NEU**: #231 streicht die Fußleiste, sagt aber nicht, wo „Anlegen“/„Verwerfen“ hinkommen (Vorschlag: Kopf rechts „Anlegen“ statt „Fertig“, Zurück = Verwerfen). |
| A6 | Editor · Handy | Mockup zeigt die Tab-Leiste auch im Editor | Tab-Leiste sichtbar | – | design.md §7 und #218 gehen vor (keine Tab-Leiste). Kein Befund gegen das Mockup, nur zur Info. |

## B. Seitenaufbau

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| B1 | Editor · Desktop | `.editor` Raster `1fr 280px`, Abstand 32, Seitenspalte `sticky top:84px`; `.page` max. 1080 px, Padding 24/32 | Eine Spalte, `max-w-3xl` (768 px) mittig, `py-10 px-6 pb-28` | Layout | #231 (Raster). Dass die Seitenbreite 1080 statt 768 ist und das Padding 24/32, steht dort nicht ausdrücklich, ergibt sich aber aus dem Raster. |
| B2 | Editor · Desktop | Quelle und Notizen in der Seitenspalte; die Grunddaten-Karte enthält nur Titel, Zeiten, Größe und Tags | „Quelle“ steht in `BasicsCard` direkt unter dem Titel, „Notizen“ am Ende von `BasicsCard`, „Bilder“ unter allen Abschnitten | Struktur | #231 |
| B3 | Editor · Handy | Reihenfolge: Bilder → Grunddaten → Abschnitte → „+ Abschnitt“ → Notizen → Quelle → Hinweis | Grunddaten (mit Quelle und Notizen) → Abschnitte → Bilder | Struktur | #218 / #231 |
| B4 | Editor · Handy | `.page` Padding 12/16/32; `.ed-basics` Padding 14, `.ed-sec` 12/14/14 (screens.css 1979–1997); Felder sind dadurch ca. 330 px breit | Seite `px-6` (24) plus `CardContent` 24 px; Felder ca. 290 px breit, Notiz-Feld wegen der Pfeile nur ca. 175 px | Fein | **NEU** (Handy-Abstände; passt in das Paket von #218) |
| B5 | Editor · Desktop | Grunddaten-Karte `.ed-basics` Padding 16, Feldabstand 16; Abschnitt `.ed-sec` 14/16/16; Karten-Abstand 18 (`.ed-main gap`) | `CardContent pt-6`, `gap-6` (24) in der Karte, `gap-4` zwischen Karten | Fein | #231/#232 (gehört zum Neuaufbau, Zahlen nicht genannt) |
| B6 | Editor · Laden | – | Ein einzelner `Skeleton h-40` | Fein | **NEU** (klein): design.md §5 verlangt ein Skelett in Form des Inhalts, also zwei Spalten. Nicht aus dem Mockup. |

## C. Grunddaten-Karte

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| C1 | Titel | `.big-input` 46 px hoch, Schrift 19 px/600; Label `.flabel` 13/600 | Normales `Input` (36 px, 14 px); Platzhalter „Cremige Pilz-Pasta“ | Layout | #231 |
| C2 | Titel · mit `{tag}` | – | „Vorschau: Spaghetti 🌿 Bolognese“ darunter | – | Laut #231 bleibt das so. OK. |
| C3 | Zeiten | Zwei Felder in einem Raster `minmax(0,160px)` ×2 mit „min“ (subtle) **im** Feld (`.input num … <span class="subtle">min</span>`) | `w-24`-Inputs, „Min.“ **neben** dem Feld, `type=number` mit Spinner | Layout/Text | #231 |
| C4 | Größe · Umschalter | `.seg` „Portionen | Freitext“ (32 px, Look aus V1) | `RadioGroup` mit zwei Radios (16 × 16) | Struktur | #231 |
| C5 | Größe · Felder | `.ed-size`: Zahl 72 px + Text `flex:1`, 8 px Abstand, `margin-top 8` | Zahl `w-24` (96 px) + Text | Fein | #231 („Felder wie Mockup“) |
| C6 | Größe · Hilfetext | „Portionen: Beim Kochen wählt man die Anzahl, Mengen rechnen sich um. Freitext (z. B. „26 cm {Springform}“): Man skaliert mit einem Faktor ×½, ×2 …“ | Kein Hilfetext. Platzhalter im Freitext-Modus „28 cm {Springform}“ | Text | #231 (Hilfetext). **NEU** (klein): 28 cm vs. 26 cm angleichen. |
| C7 | Größe · Fehler | – | „Mindestens 1 Portion.“ rot unter dem Feld, roter Rand | – | Kein Mockup; bleibt. |
| C8 | Tags · Feld | **Ein** `.input.tags-input` (min. 38 px, umbrechend) mit `.tag`-Chips (22 px, 12 px/500, `--tag-bg`, ✕ 12 px) und einem Eingabefeld „Tag hinzufügen“ | `Badge secondary` (größer, 14 px, ✕ als eigener Button) plus separater Knopf „+ Tag“ | Struktur | #231 |
| C9 | Tags · Chips mit Icon | Editor-Chips im Mockup ohne Tag-Icon (`<span class="tag">${t} ✕</span>`, app.js 763) | Chip zeigt das Tag-Icon (🌿 Vegan) | Fein | **NEU** (klein; Entscheidung, ob das Icon bleibt, sonst Mockup = ohne) |
| C10 | Tags · Vorschlagsliste offen | – (kein Zustand) | Popover am Knopf „+ Tag“ mit eigenem Suchfeld „Tag suchen …“, „Kein passender Tag.“ (`st-tagpop-*.png`) | Verhalten | #231 nur teilweise (AK 3: Tastatur). **NEU**/Präzisierung: Mit einem einzigen Feld müssen die Vorschläge beim Tippen **unter dem Feld** aufklappen (Combobox), nicht in einem Popover mit zweitem Suchfeld. |

## D. Seitenspalte: Bilder, Notizen, Quelle, Hinweis

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| D1 | Bilder · ohne Fotos | `.ed-drop`: volle Breite, 4:3, gestrichelt, Icon `image`, „Fotos hinzufügen“, darunter „Das erste wird Hauptbild“ | 80 × 80-Kachel mit `Upload`-Icon, ohne Text | Struktur/Text | #231 |
| D2 | Bilder · mit Fotos | Hauptbild 4:3 (volle Breite) mit Badge „Hauptbild“ oben links; Galerie 4 Spalten quadratisch, Abstand 6; kleines gestricheltes +-Feld; Hinweis „Bild antippen: als Hauptbild setzen oder entfernen.“ | Alle Bilder 80 × 80 im Fließlayout, unter jedem Stern- und Mülleimer-Knopf, „★ Hauptbild“ als Bildunterschrift, Upload-Kachel | Struktur | #231 (Präzisierung). Das Verhalten beim Antippen eines Bilds (welche Auswahl erscheint) ist nicht festgelegt, beim Bauen klären. |
| D3 | Bilder · Handy | Hauptbild **16:9**, Galerie **5** Spalten (screens.css 1989–1993) | wie Desktop | Fein | **NEU** (Handy-Bilder; zusammen mit #218 „Bilder oben“) |
| D4 | Bilder · Upload | „Fotos“ (Plural) | `input type=file` ohne `multiple`, also nur ein Bild pro Auswahl | Verhalten | **NEU** (klein) |
| D5 | Notizen | Überschrift `.col-h` „Notizen“ (12/600 subtle); je Notiz **Textarea** (`.input.area`, 2 Zeilen) + ⋮ (`ellipsis-vertical`); „+ Notiz“ | Einzeiliges `Input` + ▲▼🗑; „Notiz hinzufügen“ in `text-primary` | Struktur/Text | #231 (Menü, „+ Notiz“). **NEU**-Detail: Textarea statt einzeiligem Feld. Icon laut Mockup ⋮, #231 schreibt „⋯-Menü“. |
| D6 | Quelle | Seitenspalte, `.col-h` „Quelle“, Platzhalter „Omas Rezept oder https://…“ | In der Grunddaten-Karte, gleicher Platzhalter | Struktur | #231 |
| D7 | Hinweis | „Kategorien setzt du im Rezept über „+“, Teilen über ⟨share⟩ – beides gehört nicht zum Rezept selbst.“ | fehlt | Text | #231 (ohne den Teilen-Halbsatz) |

## E. Abschnitte, Zutaten, Schritte (Desktop)

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| E1 | Abschnittskopf | Griff + Name als randloses Feld (16 px/650, Platzhalter „Abschnitt ohne Namen“) + ⋯ (`more-horizontal`) | Label „Abschnittsname“ + umrandetes Input (Platzhalter „ohne Namen“) + ▲▼🗑 | Struktur/Text | #232 |
| E2 | Zutaten · Spaltenkopf | „Menge · Einheit · Zutat · Zusatz“, Raster `18px 96px 90px 1fr 0.7fr 30px` | Label „Zutaten“, keine Spaltenköpfe, Flex-Reihe `w-16 w-20 w-20 min-w-40 w-32` + drei Knöpfe | Struktur | #232 |
| E3 | Zutat · Präfix | Kein Präfix-Feld: „ca. 800“ steht als ein Wert im Feld Menge (`amtView`, README §3.3, Aufteilung beim Speichern) | Eigenes Feld „Präfix“ (Platzhalter „ca.“) vor der Menge | Struktur/Verhalten | #232 implizit (vier Spalten). Die Aufteil-Regel aus README §3.3 (reine Funktion + Tests) steht nur in #217 (Sheet). **NEU**-Präzisierung für #232, damit der Desktop sie auch nutzt. |
| E4 | Zutat · Platzhalter | „Menge“, „Einheit“, „Zutat“; Zusatz leer | „ca.“, „400“, „g“, „Zutat …“, „z. B. gehackt“ in **jeder** Zeile, sodass leere Felder wie Werte aussehen (z. B. Salz: „ca. 400 g“ grau) | Text | **NEU** (gehört in #232) |
| E5 | Zutat · Einheit | `.input sm` mit `chevron-down`: Combobox, Vorschläge g, kg, ml, EL, TL, Prise, Stück + freier Text (README §3.3) | Freies `Input`, keine Vorschläge | Verhalten | #232 („Einheit als Auswahl“) |
| E6 | Zutat · Zutatensuche | Echtes Eingabefeld mit `search`-Icon rechts, man tippt direkt in die Zeile | Knopf (`TriggerButton`) mit `ChevronsUpDown`, öffnet ein Popover mit eigenem Suchfeld „Zutat suchen …“, Treffern und „„xyz“ als Freitext übernehmen“ (`st-ingpop-*.png`) | Verhalten/Struktur | #232 nennt nur das „Such-Icon“. **NEU**-Präzisierung: Tippen im Feld selbst, Treffer klappen darunter auf; der Freitext-Eintrag bleibt. |
| E7 | Zutat · Zusatz bei Freitext | Feld immer gleich dargestellt | Bei Freitext-Zutat `disabled`, ohne Platzhalter | – | Folgt README §3.3 (bei Freitext wird nichts zerlegt). Kein Befund. |
| E8 | Zeilenaktionen | Ein ⋮ (`ellipsis-vertical`) je Zutat und Schritt, ⋯ im Abschnittskopf; Ziehgriffe ⋮⋮ | ▲ ▼ 🗑 je Zeile (`RowActions.tsx`), keine Griffe | Struktur | #232 (Dropdown; Griffe nur, wenn Ziehen geht) |
| E9 | Hinzufügen | „+ Zutat“ und „📋 Mehrere einfügen“ (`clipboard-paste`) nebeneinander (`.ed-adds`); „+ Schritt“; `.btn.ghost.sm.add` in `--fg-muted` | Nur „Zutat hinzufügen“ / „Schritt hinzufügen“ in `text-primary`; **„Mehrere einfügen“ gibt es in der App gar nicht** | Struktur/Text/Fein | Labels: #232 („+ Zutat wie Mockup“). **NEU**: „Mehrere einfügen“ (Liste einfügen und nach README §3.3 zerlegen) fehlt. #217 geht fälschlich davon aus, dass es das „wie heute“ schon gibt. Farbe muted statt primary ist ebenfalls NEU (Fein). |
| E10 | Schritte · Nummer | `.sn` 24 px Kreis, `--surface-2`, Text `--fg-muted` (grau) | 20 px Kreis `bg-primary` (schwarz bzw. weiß gefüllt) | Fein | **NEU** (Detail zu #232) |
| E11 | Schritte · Feld | `.input.area` mit Textarea, 2 Zeilen, `resize:none`, Raster `28px 1fr 30px`; Überschrift `.col-h` „Zubereitung“ (`margin-top 18`) | `Textarea min-h-14` mit Resize-Griff, Label „Zubereitung“ | Fein | #232 (Rest). Resize-Griff weg: **NEU**-Detail. |
| E12 | Hinweis Timer | Im 1. Abschnitt: „Zeitangaben wie „30 Minuten“ werden im Rezept zu Timern, die man antippen kann.“ | fehlt | Text | #232 |
| E13 | + Abschnitt | `.btn.dashed` volle Breite „+ Abschnitt hinzufügen“ + Hinweis „Abschnitte nur, wenn …“ | `outline sm` Knopf links, kein Hinweis | Struktur/Text | #232 |
| E14 | „Zutat bearbeiten“ · Desktop | `sheet=ing` öffnet auf dem Desktop eine Seitenschublade | – | – | Laut #232 bekommt der Desktop ein Dropdown, das Panel gehört zu #217. Kein Befund. |

## F. Handy: Zutaten-Zeilen und Sheet „Zutat bearbeiten“

| # | Screen · Zustand | Mockup | App | Art | Abgedeckt |
|---|---|---|---|---|---|
| F1 | Zutaten · Handy | `.ed-ing-m`: Lesezeile, min. 46 px, Trennlinien oben/unten; Menge+Einheit **rechtsbündig in 72-px-Spalte, muted**; Name normal, Zusatz muted; `chevron-right` rechts; ganze Zeile antippbar | Komplettes Formular pro Zutat, umbrochen auf 3 Zeilen (Präfix/Menge/Einheit, Zutat, Zusatz + ▲▼🗑) | Struktur | #217. **Abweichung im Issue-Text:** #217 will Präfix/Menge/Einheit „normal“, das Mockup zeigt sie muted und rechtsbündig in einer eigenen Spalte, mit Chevron. Das Mockup gilt, #217 sollte nachgeschärft werden. |
| F2 | Abschnittskopf · Handy | Ohne Griff, Name randlos + ⋯, keine Spaltenköpfe | wie Desktop-App | Struktur | #232/#217 |
| F3 | Sheet · Titel | „Zutat bearbeiten“ (Griff, Titel, ✕) | – | Text | #217 nennt „Zutat“. **NEU**-Korrektur: Mockup-Titel „Zutat bearbeiten“. |
| F4 | Sheet · Menge | Ein Feld „ca. 800“ + Hilfetext „Auch „ca. 800“, „1–2“ oder „½“.“ | – | Text | #217 (Feld). Hilfetext: **NEU**-Detail zu #217 |
| F5 | Sheet · Einheit | Combobox + Schnellwahl-Chips `.fchip` g · kg · ml · EL · TL · Prise · Stück (aktiver Chip gefüllt) | – | Struktur | #217 nennt nur die Combobox. **NEU**-Detail: Chip-Reihe |
| F6 | Sheet · Zutat | Feld mit Such-Icon + Hilfetext „Aus dem Zutaten-Katalog, sonst Freitext.“ | – | Text | #217 (Feld). Hilfetext: **NEU**-Detail |
| F7 | Sheet · Zusatz | Platzhalter „z. B. gehackt, nach Geschmack“ | – | Text | #217 (Feld). Platzhalter: **NEU**-Detail |
| F8 | Sheet · Aktionen | Reihe `.ing-moves`: „↑ Nach oben“, „↓ Nach unten“ (`btn sm`), „🗑 Entfernen“ (`btn sm ghost danger`, rot) | – | Struktur | #217 |
| F9 | Sheet · Fuß | Feste Fußleiste, „Fertig“ primär über die volle Breite | – | Struktur | #217 |
| F10 | Schritte · Handy | Gleiches Raster wie Desktop: Nummer 28 px links, Textarea, ⋮ rechts (`.ed-step` gilt auch ≤ 760) | 20-px-Nummer + schmale Textarea (ca. 150 px) + ▲▼🗑 | Layout | #218. **Konflikt:** #218 will Nummer und Aktionen über oder neben dem Feld, „nicht in einer eigenen Spalte“. Das Mockup behält eine schmale Nummern-Spalte. Wenn ▲▼🗑 durch ⋮ (30 px) ersetzt werden, reicht die Breite, also gilt das Mockup. #218 nachschärfen. |
| F11 | Notizen/Quelle · Handy | Unten, Notiz als Textarea volle Breite + ⋮, „+ Notiz“, Quelle, Hinweis; `.ed-notes-h` margin-top 4 | In der Grunddaten-Karte | Struktur | #218/#231 |
| F12 | + Abschnitt · Handy | Gestrichelt, volle Breite + Hinweis | `outline sm` | Struktur | #232 |

---

## Vorschlag: NEU-Befunde als Issues (je ein PR)

1. **Editor-Kopf: Fehler-, Validierungs- und Neu-Zustände** (vor bzw. mit #231): A4, A5. Festlegen und bauen: „Nicht gespeichert · Erneut versuchen“ und „Portionen prüfen“ im Kopf (Desktop mit Text, Handy mit Icon und erreichbarem Retry). Auf `/recipes/new` „Anlegen“ statt „Fertig“ im Kopf; „Verwerfen“ = Zurück. Dazu B6 (Skelett zweispaltig).
2. **„Mehrere einfügen“** (E9): Knopf neben „+ Zutat“ (Desktop und Handy), Dialog bzw. Sheet zum Einfügen, Zerlegung mit der Präfix-/Mengen-Regel aus README §3.3 als reine Funktion mit Tests (dieselbe Funktion wie E3). Voraussetzung für #217 („bleibt erreichbar“).
3. **Präzisierungen zu #232, Zeilen-Inhalte** (als Nachtrag in #232 oder kleines Folge-Issue): E3 (Präfix ins Mengenfeld + Aufteil-Regel), E4 (Platzhalter „Menge/Einheit/Zutat“, keine Beispielwerte), E6 (Zutat als echtes Tipp-Feld mit Treffern darunter), E9 (Farbe muted), E10 (Schritt-Nummer grau 24 px), E11 (kein Resize-Griff).
4. **Präzisierungen zu #231, Grunddaten/Seitenspalte** (Nachtrag): C10 (Tag-Vorschläge als Combobox unter dem Feld), C9 (Tag-Icon im Chip ja/nein), C6 (26 cm statt 28 cm), D5 (Notiz als Textarea, Icon ⋮), D4 (mehrere Fotos auf einmal).
5. **Handy-Feinschliff Editor** (Nachtrag zu #218 oder eigenes kleines Issue nach #218): B4 (Seiten- und Karten-Padding 16/14 wie Mockup), D3 (Hauptbild 16:9, Galerie 5 Spalten), F10 (Schritt-Raster wie Mockup statt „Nummer darüber“).
6. **Nachschärfen #217** (Text im Issue korrigieren, kein eigener PR): F1 (Menge muted, rechtsbündig, 72-px-Spalte, Chevron, 46 px), F3 (Titel „Zutat bearbeiten“), F4–F7 (Hilfetexte, Einheiten-Chips, Platzhalter Zusatz).
