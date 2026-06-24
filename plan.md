# Foodly Frontend — Bau-Plan

Lebendes Dokument. Reihenfolge der Phasen ist bewusst so gewählt, dass alles
**ohne Backend** (mit Mock-Daten aus `src/mocks`) baubar und sichtbar ist.
Persistenz-abhängige Features kommen ans Ende.

## Leitplanken

- **Kein Backend / keine Persistenz** bis auf Weiteres. Lesen ist echt (Mocks),
  Schreiben würde nur im Browser-State leben → Schreib-Features nach hinten.
- Alle Daten über `src/api` (`foodly.*`), nie direkt am Socket.
- UI ausschließlich mit `@postxl/ui-components` + Tailwind-Tokens.
- Kein Login/Auth jetzt — „aktueller User" ist gemockt (`CURRENT_USER_ID = 1`).

Details je Phase in `docs/phases/`.

---

## Phase 0 — Datenaufbereitung  (Querschnitt)

Wie Backend-Daten strukturiert, gecacht und für die Anzeige aufbereitet werden:
DTOs unangetastet (`protocol.ts`), geteilte Entities flach als Lookup-Maps,
Resolve an der API-Grenze (View-Modelle in `views.ts`). Klein halten — nur was
die nächste Phase braucht. → `docs/phases/phase-0-datenaufbereitung.md`

## Phase 1 — Rezepte ansehen  ⬅️ JETZT

Das Herzstück: Rezepte durchstöbern und ein Rezept im Detail lesen. Reines
Lesen, passt 1:1 zu den Mock-Daten.

- **Rezeptliste** (`/`) — kompakte Zeilen (Name, Zeit, Rating, Tags).
- **Rezept-Detail** (`/recipes/:id`) — Kopf + Meta-Zeile, Notizen, je Section
  ein 2-Spalten-Block (Zutaten links, Schritte rechts), screen-first.

→ Volle Spezifikation: `docs/phases/phase-1-rezepte-ansehen.md`

## Phase 2 — Organisation & Navigation

Struktur um die Liste herum, sobald es mehr als eine Handvoll Rezepte gibt.

- Kategorien (`userCategory`) als Sidebar/Filter, inkl. Farben.
- Filtern nach Tags, Volltext-Suche über Namen/Zutaten.
- „Meine Rezepte" vs. „mit mir geteilt" (owner vs. viewer/editor).
- Sortierung (Name, Zeit, Rating).

## Phase 3 — Koch-Modus

Die Detailansicht für das tatsächliche Kochen optimieren.

- Schritt-für-Schritt-Ansicht (ein Schritt groß, durchblättern).
- Portionen umrechnen (`basePortionMultiplier` → Mengen skalieren).
- „Bildschirm anlassen" (`useWakeLock` ist schon da) hier sinnvoll einbinden.
- Zutaten abhaken (lokaler State, kein Persist nötig).

## Phase 4 — Rezepte bearbeiten  (braucht Backend)

Anlegen/Editieren von Rezepten. **Blockiert auf Persistenz** — ohne Backend nur
als UI-Prototyp mit lokalem State sinnvoll.

- Formular für Rezept (Sections, Zutaten, Schritte).
- Rezept duplizieren (Kopie, bei der man selbst owner wird).
- Rating abgeben, Notizen bearbeiten.

→ Erst sinnvoll, wenn der Login-/Backend-Workflow steht.

---

## Offene Punkte (später)

- Login-/Auth-Workflow (Voraussetzung für Phase 4 und echtes Multi-User).
- Bilder: `image.hash` → echte Image-URL (Backend-abhängig).
- Tag-SVGs (`tag.svg` Hash) rendern.
