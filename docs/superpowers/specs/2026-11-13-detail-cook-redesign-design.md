# Redesign Schritt 6: Rezept-Detail und Koch-Modus — Design

> Freigegeben von Daniel am 2026-11-13 (über den Dispatcher). Issues R1–R5:
> `docs/superpowers/plans/2026-11-13-detail-cook-redesign.md`.

Quellen: `docs/design/redesign/README.md` §1.5, §1.6 („Koch-Modus“), §1.7, §2 („Detail“), §3.2, §3.4;
`docs/design.md` §4; Mockup `docs/design/redesign/app.js` (`detailBody`, `S.detail`, `S.cook`). Maße stammen aus den
Design-Notizen des Designers vom 2026-11-13.

## Ziel

Das Detail wird ruhiger und folgt dem Redesign. Der neue Koch-Modus ist eine eigene Vollbild-Ansicht, die Schritt für
Schritt durch das Rezept führt. Das Backend bleibt unverändert, alle Daten liefert schon `GET /recipes/{id}`.

## Entscheidungen (Daniel, 2026-11-13)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Schritt-für-Schritt-Modus (Phase 3 hatte ihn ausgeschlossen) | Das Redesign gilt: Koch-Modus als Vollbild-Route. |
| 2 | Abhaken und Wachhalten | Gibt es im Detail **und** im Koch-Modus. |
| 3 | Teilen-Knopf | Kommt erst mit Backend #12, es gibt keinen Demo-Stub. |
| 4 | „Dafür“-Zutaten pro Schritt | Bleiben. Gezeigt werden die Zutaten des Abschnitts, zu dem der Schritt gehört, denn das Modell kennt keine Zuordnung von Schritt zu Zutat. |
| 5 | Laufende Timer als Karte im Schritt | Entfallen, dafür gibt es den Timer-Knopf im Kopf. |
| 6 | Breakpoint Bild/Infos | Nebeneinander erst ab 1100 px. |
| 7 | „Kochen“ bei Rezepten ohne Schritte | Wird ausgeblendet, nicht deaktiviert. |
| 8 | Abgehakte Zutaten | Liegen **nur im Speicher**, wie heute. Es gibt kein sessionStorage und keinen localStorage. |

## Geteilter Zustand zwischen Detail und Koch-Modus

- **Größe:** Search-Parameter auf beiden Routen. Bei Portionen-Rezepten heißt er `?servings=<n>` (ganze Zahl ≥ 1), bei
  Rezepten mit fester Größe (`sizeNumber = null`) `?factor=<x>` aus der Stepper-Reihe ×¼ … ×2. Fehlt der Parameter
  oder ist er ungültig, gilt der Grundwert (Faktor 1). Der Stepper schreibt mit `replace`, damit keine Verlaufseinträge
  entstehen. „Kochen“ und ✕ nehmen den Parameter mit.
- **Abhaken:** Die Häkchen liegen in einem kleinen In-Memory-Store auf Modulebene (`src/cook/checkedIngredients.ts`,
  `useSyncExternalStore`), getrennt pro Rezept-ID. Zwischen Detail und Koch-Modus desselben Rezepts bleiben sie
  erhalten. Sobald ein **anderes** Rezept geöffnet wird, verschwinden sie, ebenso bei einem Reload. So verhält sich das
  Abhaken auch heute: Ein Rezeptwechsel leert es.
- **Wachhalten:** Im Detail bleibt der Schalter, wie er ist. Im Koch-Modus geht der Wake Lock beim Öffnen automatisch
  an (`useWakeLock(true)`). Ein Schalter im Kopf erlaubt, ihn auszuschalten, und beim Verlassen wird er freigegeben.

## Detail (`/recipes/:id`)

**Layout.** Ab 1100 px stehen Hauptbild und Infos nebeneinander: Raster `1fr 1fr`, Abstand 32 px, oben ausgerichtet,
das Bild im Format 4:3 mit `rounded-lg`. Unter 1100 px wird gestapelt: Bild in voller Breite (max. 640 px, 4:3), Abstand 20 px.
**Ohne Foto** gibt es keinen Hero und keinen Platzhalter. Der Text-Kopf ist dann max. 720 px breit, der Titel 32 px groß.
Ohne Foto entfällt auch die Galerie.

**Infos, in dieser Reihenfolge:**
1. Kategorie-Chips mit „+“. Ohne Kategorie steht dort „+ Zu Kategorie hinzufügen“ (`RecipeCategoryChips` bleibt).
2. Titel als Seitentitel: 26 px / 650, ohne Foto 32 px.
3. Meta-Zeile: Sterne (`Rating`), Zeit, Herkunft. Herkunft heißt „von <Besitzer>“, wenn ich nicht der Besitzer bin,
   oder „mit <Name>“, wenn es Editoren gibt. Die Namen kommen aus dem Katalog.
4. Tags, `mt-3`.
5. Notizen als schlichte `ul` ohne Kasten und ohne Icon: `mt-4`, 14 px, muted, jede Notiz eine eigene Zeile.
6. Aktionszeile, `mt-5`, mit `flex-wrap`: links der Größen-Stepper, daneben Abhaken und Wachhalten, rechts der
   Primärknopf „Kochen“ (Icon `chef-hat`). Für Rezepte ohne Schritte entfällt „Kochen“.

Leere Teile (keine Tags, keine Notizen, keine Quelle) entfallen ganz, ohne Leerzeile.

**Aktionen oben** in der Seitenzeile neben „← Zurück“:
- Desktop: „Kopie erstellen“ als Icon mit Tooltip, „Bearbeiten“ (Stift und Text) bei Bearbeitungsrecht, „Löschen“
  nur für den Besitzer.
- Handy: nur Icons mit 40 px Tippfläche. Wer bearbeiten darf, bekommt den Stift. Wer nur ansehen darf, bekommt statt
  des Stifts „Kopie erstellen“. Ein „…“-Menü gibt es nicht. Das Wort „Duplizieren“ heißt künftig überall
  „Kopie erstellen“.

**Abschnitte.** Ab 1024 px zwei Spalten im Verhältnis `2fr 3fr`, Abstand 40 px, darunter gestapelt mit 24 px Abstand.
Zwischen den Abschnitten liegen 40 px (`mt-10`). Der Abschnittstitel (19 px / 650) erscheint nur, wenn es mehr als einen
Abschnitt gibt und dieser einen Namen hat. Die Spaltentitel „Zutaten“ und „Zubereitung“ sind 12 px / 600 und muted.
Schrittnummern stehen in Kreisen. Zutaten und Schritte haben 15 px. Timer-Chips (`StepText`) und Abhaken
(`IngredientLine`) bleiben.

**Galerie.** Die Galerie steht unter den Abschnitten mit der Überschrift „Fotos“ und der Anzahl. Sie hat genau eine
Reihe: ab 761 px vier Kacheln, darunter drei. Die Kacheln sind 1:1 mit 8 px Abstand. Die letzte sichtbare Kachel trägt
„+N“, wobei N = Gesamtzahl − sichtbare Kacheln + 1, und öffnet die Lightbox ab dort. Das Hauptbild öffnet die Lightbox
ab Bild 1. `Lightbox.tsx` bleibt unverändert.

## Koch-Modus (`/recipes/:id/cook`)

**Rahmen.** Vollbild ohne Seitenleiste und ohne Tab-Leiste, aber hinter `RequireAuth`. Timer-Provider und Timer-Knopf
stehen auch hier zur Verfügung.

**Kopf.** Von links nach rechts: ✕ zum Beenden, Titel, Unterzeile „<Abschnitt> · Schritt x von y“, Knopf „Zutaten“
(nur unter 1024 px), Wachhalten-Schalter und Timer-Knopf. Die Schritte werden über alle Abschnitte durchgezählt. Einen
Abschnittsnamen gibt es in der Unterzeile nur, wenn der Abschnitt einen hat. Darunter liegt ein Fortschrittsbalken (3 px)
mit dem Anteil Schritt/Gesamt.

**Hauptspalte.** Die Spalte ist max. 860 px breit, mit Innenabstand oben 8vh und seitlich 56 / 40 / 20 px (Desktop /
Tablet / Handy). Ganz oben steht „Schritt n“. Darunter der Schritttext mit Timer-Chips, Schriftgewicht 600 und
Zeilenhöhe 1,3, in der Größe 34 px ab 1024 px, 30 px bei 761–1023 px und 26 px darunter. Es folgt „Dafür“ mit den
Zutaten des aktuellen Abschnitts als Chips, die Mengen sind skaliert. Hat der Abschnitt keine Zutaten, entfällt dieser
Block. Zuletzt kommt „Danach“ mit dem nächsten Schritt in muted. Beim Wechsel des Abschnitts steht der Name des neuen
Abschnitts davor („Teig · …“). Im letzten Schritt entfällt „Danach“.

**Fuß.** „Zurück“ ist im ersten Schritt sichtbar, aber deaktiviert. In der Mitte stehen Punkte; bei mehr als 12 Schritten
statt der Punkte „4 / 18“ in `tabular-nums`. Rechts steht „Weiter ›“, im letzten Schritt stattdessen der Primärknopf
„Fertig“ mit Haken. „Fertig“ verhält sich wie ✕, es gibt keinen Abschluss-Screen. Die Tastatur bedient den Koch-Modus
mit ← und → zum Blättern und mit Esc wie ✕. Der aktuelle Schritt steht nicht in der URL, ein Reload beginnt also wieder
bei Schritt 1.

**Zutaten.**
- Ab 1024 px gibt es links eine Spalte, 280 px breit (ab 1280 px 320 px), mit `border-r`. Oben steht der
  Größen-Stepper, darunter alle Zutaten nach Abschnitten, jeweils abhakbar.
- Unter 1024 px öffnet der Knopf „Zutaten“ ein `BottomSheet` mit demselben Inhalt.
- Abgehakte Zeilen werden durchgestrichen und muted dargestellt.
- Die Mengen in den Schritttexten werden nicht skaliert, sie sind Freitext.

**Zurück heißt zurück (§3.4).** ✕, „Fertig“ und Esc führen mit `navigate(-1)` zurück, wenn es einen Verlauf innerhalb der
App gibt. Sonst geht es zu `/recipes/:id`, mit dem Größen-Parameter.

**Zustände.**
- Laden: ein Skelett in Form eines Schritts.
- Fehler: `RetryAlert` mit „Erneut versuchen“.
- Rezept ohne Schritte: Der Rahmen zeigt nur ✕ und den Titel, ohne Balken und ohne Fuß. Darin steht „Dieses Rezept
  hat noch keine Schritte.“ mit dem Knopf „Zum Rezept“ und, bei Bearbeitungsrecht, zusätzlich „Bearbeiten“.

## Nicht im Umfang

Teilen (Backend #12), eine Zuordnung von Schritt zu Zutat (bräuchte eine Schemaänderung), Schritt-Timer aus dem Schema
(B10), Persistenz von Häkchen oder Schritt, die Breadcrumb-Herkunft im Kopf (§3.4) und Seitenaktionen in der
Shell-Kopfzeile. Die Aktionen bleiben in der Seitenzeile, wie auf allen anderen Seiten.
