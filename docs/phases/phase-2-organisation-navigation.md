# Phase 2 — Organisation & Navigation (Spec — in Arbeit)

> ⚠️ **Noch NICHT implementierungsreif.** Dieses Spec entsteht inkrementell,
> während [Phase 1](./phase-1-rezepte-ansehen.md) läuft. **Entkoppelte**
> Entscheidungen (Logik, Datenmodell, Scope) werden jetzt festgezurrt; alles
> **Visuelle/Layout** kommt **nach Phase 1**, sobald die Liste real gerendert
> vorliegt und wir darauf aufsetzen können.
>
> **Offene Themen vor der Umsetzung:**
> - **Layout/Design** (Sidebar, Filter-Leiste, Zeilen- & Ansichts-Varianten) —
>   erst nach Phase 1, weil Phase 2 visuell auf der dort entstehenden Liste
>   aufbaut.
> - **A — Filtern/Suchen/Sortieren:** Kern entschieden (siehe §A); offen nur noch
>   Kategorie-Sidebar single-/multi-select und finale Sort-Bestätigung.
> - **C — Listen-Ansichten** (`detailed ↔ compact`, `by category ↔ flat`):
>   noch nicht spezifiziert.
> - **Achse-1-Benennung** der Rollen-Modi (§D) final festlegen.
> - Diverse **Protokoll-/Backend-Fragen** — siehe `../plan.md` „Offene Punkte"
>   (mit dem Backend-Team zu klären, später).

## Scope

Phase 2 = **A + C + D**. Das **Dashboard/Startseite** ist herausgelöst zu
**Phase 5** (backend-blockiert auf fehlende Timestamps), siehe `../plan.md`.

- **A — Filtern / Suchen / Sortieren** über die Liste (Kategorie-Sidebar,
  Tag-Filter, Volltext, Sortierung).
- **C — Listen-Ansichten** (umschaltbar: `detailed/compact`, `by-category/flat`).
- **D — Rollen-Modi** (Filter nach der Rolle des aktuellen Users).

---

## D — Rollen-Modi (Filter nach Rolle) ✅ entschieden

Ersetzt die frühere flache, überlappende 5-Modi-Liste (`all / editable / shared
/ provided / private`) durch ein **Zwei-Achsen-Modell**. Beide Achsen sind aus
`recipe.owner` / `recipe.viewers` / `recipe.editors` und `CURRENT_USER_ID`
ableitbar — **kein Backend nötig**.

### Die zwei Achsen

**Achse 1 — meine Rolle** (`owner` / `editor` / `viewer`): beantwortet „darf ich
das bearbeiten?".

- `owner` — `recipe.owner === CURRENT_USER_ID`
- `editor` — ich stehe in `recipe.editors` (und bin nicht owner)
- `viewer` — ich stehe in `recipe.viewers` (und bin weder owner noch editor)

**Achse 2 — Collaboration** (Sharing-Zustand des Rezepts, unabhängig von mir):

- **Private** — keine viewers, keine editors (nur der owner hat Zugriff)
- **Shared** — es gibt viewers, aber keine weiteren editors (andere dürfen nur
  **lesen**)
- **Collaborative** — mindestens ein editor außer dem owner (andere dürfen
  **mitbearbeiten**)

Benennung bewusst **englisch**, mit „Collaboration"-Stamm als Anker. `Shared`
ist eindeutig, weil es *zwischen* Private und Collaborative steht = read-only
rausgegeben. (Eindeutige Alternative fürs Mittelfeld, falls je nötig:
`Read-only`.)

Jede Achse hat zusätzlich **`Any`** (= „egal"). `Any × Any` ist der frühere
„all"-Modus.

### Gültige Kombinationen (3 × 3)

Die Achsen sind **nicht unabhängig** — meine Rolle erzwingt teils den
Sharing-Zustand:

- bin ich `editor` ⇒ es gibt editors ⇒ zwingend `Collaborative`.
- bin ich `viewer` ⇒ es gibt viewers ⇒ nie `Private` (mindestens `Shared`).

| Rolle ↓ \ Collaboration → | **Private** | **Shared** | **Collaborative** |
|---|---|---|---|
| **owner** | ✅ persönliches Rezept | ✅ read-only rausgegeben | ✅ meins, co-editiert |
| **editor** | ❌ Widerspruch | ❌ Widerspruch | ✅ mit mir zum Mitbearbeiten geteilt |
| **viewer** | ❌ Widerspruch | ✅ read-only mit mir geteilt | ✅ read-only, aber kollaborativ gepflegt |

**6 von 9 gültig, 3 logisch unmöglich.** Die unmöglichen Zellen folgen aus
echten Widersprüchen, nicht aus Designgeschmack → die UI braucht **keine**
willkürlichen Prioritätsregeln, um Überlappungen aufzulösen.

### Darstellung & Interaktion — Variante (a)

Beide Achsen als sichtbare Controls (z.B. zwei segmented controls), inklusive
`Any`.

- **Ungültige Zellen werden ausgegraut**, bleiben aber **klickbar**.
- **Klick auf eine ausgegraute Option → „letzter Klick gewinnt":** die
  *Schwester-Achse* wird auf `Any` zurückgesetzt (relaxed) — **nicht** geraten.
  Beispiel: Rolle = `editor`, Klick auf `Private` → Rolle springt auf `Any`,
  Collaboration = `Private`. Keine Sackgasse, kein Intent-Raten.
- **Grau bedeutet nur *logisch* unmöglich.** Eine gültige, aber gerade **leere**
  Kombination (0 Treffer) wird **nicht** gesperrt, sondern als **„0"** angezeigt
  — sonst verwischt die Bedeutung von Grau.
- **Tooltip** (warum ausgegraut) ist **optionale Politur**: das Relax-Verhalten
  lehrt die Regel schon beim Tun. Erst nachrüsten, wenn sich im echten Gebrauch
  Bedarf zeigt.

### Offen in D

> Ob jede Achse **single-select** (ein Wert + `Any`) oder **multi-select** ist.
> Aktuelle Annahme: **single-select je Achse mit `Any`** (deckt „all" ab). Final
> beim Layout-Schliff nach Phase 1. Achse-1-**Label-Wortlaut** ebenfalls dort.

---

## A — Filtern / Suchen / Sortieren ✅ größtenteils entschieden

Mehrere Verengungen wirken gleichzeitig auf die Liste. **Alle Facetten
kombinieren als UND** (Schnittmenge): ein Rezept wird gezeigt, wenn es *jede*
aktive Facette erfüllt.

### Facetten

1. **Kategorie** (Sidebar, `userCategory`) — ein Rezept matcht, wenn seine `id`
   in `userCategory.recipes` liegt. (`UserCategory.recipes: RecipeId[]` — ein
   Rezept kann in mehreren Kategorien sein.) → *offen:* Sidebar single-select
   („eine Kategorie ansehen") vs. multi-select; Tendenz single-select.
2. **Tags** — Mehrfachauswahl, **UND** verknüpft (Rezept muss *alle* gewählten
   Tags haben).
3. **Zutaten** — Auswahl nur aus dem **globalen `Ingredient`-Katalog**;
   Mehrfachauswahl **UND** verknüpft. Match: Rezept hat je ein `RecipeIngredient`
   mit passender `ingredient.id`. Reine Freitext-Zutaten (`ingredient === null`)
   sind nicht filterbar.
4. **Dauer** — **Max-Schwellwert („bis")** auf **`workMinutes`** (kein Range; ein
   „von" hat real keinen Nutzen). `overallMinutes` als sekundäre, weniger
   prominente Option (Umschalter „auf Gesamtzeit"). Rezepte mit
   `workMinutes === null` fallen bei aktivem Filter raus („unbekannt" ≠ „≤ X").
   Filtert die **rohen** Minuten-Felder, nicht den gerenderten `time`-String.
5. **Rollen-Modi** — siehe [§D](#d--rollen-modi-filter-nach-rolle--entschieden);
   zählt als eine weitere UND-Facette.
6. **Volltext-Suche** — durchsucht **`recipe.name` (Titel) + `Section.name`
   (Abschnitts-Subtitel) + Tag-Namen**, ODER-verknüpft über diese Felder. Tags
   sind dabei, weil billig & bequem (tippen statt Tag-Filter öffnen) — kein
   Konflikt mit dem präzisen Tag-Filter. **Bewusst NICHT durchsucht:**
   Zutatennamen (dafür der strukturierte Zutaten-Filter) und Schritt-Text.

### Sortierung (Vorschlag, zu bestätigen)

- Optionen: **Name** (A–Z), **`workMinutes`** (aufsteigend), **Rating**
  (absteigend; `averageRating` aus `views.ts`).
- Default: **Name A–Z**, Richtung je Option umschaltbar.
- Rezepte mit `null` im Sortierfeld ans Ende.

### Offen in A

> - **Kategorie-Sidebar:** single- vs. multi-select (Tendenz single).
> - **Sort:** finale Options-/Default-Bestätigung.

## C — Listen-Ansichten

> Noch zu diskutieren, primär **nach Phase 1** (baut auf der dort entstehenden
> Zeile/Liste auf): `detailed ↔ compact`, `by category ↔ flat`, Persistenz der
> Auswahl, Default-Ansicht.
