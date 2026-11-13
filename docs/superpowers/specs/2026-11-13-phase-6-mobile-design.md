# Phase 6 — Mobile optimieren — Design

> Freigegeben von Daniel am 2026-11-13 (12:07, über den Dispatcher). Issues M1–M8:
> `docs/superpowers/plans/2026-11-13-phase-6-mobile.md`.

Grundlage ist der QA-Mobile-Audit vom 2026-11-13 auf `main` @ `1f6fd5f`, bei 375×812 und 768×1024 in Chrome mit
Touch-Emulation. Den Absturz der Kategorie-Seite aus diesem Audit behebt #211, er gehört nicht zu Phase 6. Detail und
Koch-Modus sind ausgenommen, sie werden mit #206–#210 neu gebaut und folgen dort schon diesen Regeln.

## Ziel

Foodly lässt sich auf Handy und Tablet bequem mit dem Finger bedienen, startet schnell und lässt sich als App auf den
Home-Bildschirm legen. Das Backend bleibt unverändert.

## Entscheidungen (Daniel, 2026-11-13)

| # | Frage | Entscheidung |
|---|---|---|
| a | PWA-Umfang | Nur ein Manifest, damit man Foodly installieren kann. Es gibt keinen Service Worker, Offline kommt in Phase 8. |
| b | iOS-Zoom beim Fokus | Eingabefelder auf Touch-Geräten mit 16 px. Das Zoomen der Seite wird nicht gesperrt (`maximum-scale` bleibt weg). |
| 1 | Tippflächen | Mindestens 40 × 40 px auf **allen Touch-Geräten** (`pointer: coarse`), unabhängig von der Breite. |
| 2 | Seitenleiste auf dem Tablet hochkant | Unter 1024 px startet sie eingeklappt. Eine gemerkte Einstellung des Nutzers hat Vorrang. |
| 3 | Tab-Leiste im Editor (Handy) | Wird ausgeblendet. Der Editor ist eine Unterseite mit „Fertig“, wie der Koch-Modus. |
| 4 | Kompakt-Ansicht auf dem Handy | Zeilen mindestens 40 px hoch. Kompakt bleibt sie durch weniger Inhalt pro Zeile. |

## Regeln (gehen in `docs/design.md` §7)

- **Touch-Variante:** `@custom-variant touch (@media (pointer: coarse))` in `src/styles/styles.css`. Tippflächen,
  Zeilenhöhen und Eingabe-Schriftgrößen für Touch hängen an `touch:`, nicht an `phone:`. Das Layout (eine Spalte,
  Tab-Leiste, Sheets) hängt weiter an der Breite (`phone:`).
- **Tippfläche** heißt die klickbare Fläche, nicht das Symbol. Ein 16-px-Icon darf bleiben, wenn Button, Zeile oder Label
  drumherum mindestens 40 × 40 px groß sind. Dropdown-Einträge, Listenzeilen, Gruppenköpfe und Links in Zeilen zählen mit.
- **Eingabefelder** (Input, Textarea, Combobox, Suchfelder) haben auf `touch:` 16 px Schrift. Die Lösung ist zentral, eine
  Regel bzw. ein Token für alle postxl-Felder, keine Klassen pro Feld.
- **Sheets** messen ihre Höhe in `dvh` und halten ihre Fußzeile mit den Aktionen über der Bildschirmtastatur
  (`visualViewport`). Feste Leisten unten (Tab-Leiste, FAB, Editor-Leiste, Sheets) halten
  `env(safe-area-inset-bottom)` frei.

## Pakete

1. **M1 Eingabe-Schrift:** heute 14 px auf dem Handy und 13 px auf dem Tablet. Wird 16 px auf `touch:`.
2. **M2 Scroll-Wiederherstellung:** Die Rezeptliste speichert die Position richtig, stellt sie aber zu früh wieder her. Das
   passiert, solange nur die erste Seite geladen ist, und der Browser kürzt die Position dann auf die Seitenhöhe. Sie muss
   die gespeicherte Position erreichen, auch wenn dafür mehrere Seiten nachgeladen werden müssen.
3. **M3/M4 Editor auf dem Handy:** wie in Redesign §3.3 („Handy“).
   - M3: Zutaten als lesbare Zeilen, Bearbeiten im Sheet.
   - M4: Bilder oben, Notizen und Quelle unten, Schritte über die volle Breite, Tippflächen und die Tab-Leiste
     (Entscheidung 3).
4. **M5 Tippflächen-Sweep:** alle Stellen außerhalb von Editor und Detail, die der Audit gefunden hat. Dazu gehört
   Entscheidung 4.
5. **M6 PWA und Safe Areas:** Manifest, Icons, `viewport-fit=cover`, die Safe-Area-Abstände und Sheets mit Tastatur.
6. **M7 Code-Splitting:** heute ein Bundle mit 729 kB (219 kB gzip). Die Routen werden einzeln nachgeladen.
7. **M8 Tablet hochkant:** Seitenleiste eingeklappt (Entscheidung 2).

## Nicht im Umfang

Service Worker, Offline (Phase 8), native App (Phase 7), Detail und Koch-Modus (#206–#210), neue Funktionen. Eine
Gerätematrix gibt es nicht: Abgenommen wird mit Chrome-Touch-Emulation. Die iOS-spezifischen Punkte (Zoom, Tastatur,
Safe Area) prüft QA zusätzlich am iPhone, sobald eines verfügbar ist.
