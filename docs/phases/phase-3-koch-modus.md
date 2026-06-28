# Phase 3 — Koch-Modus (Spec)

> Die Detailansicht fürs tatsächliche Kochen schärfen: **Portionen skalieren**,
> **Zutaten abhaken** und **Bildschirm anlassen** direkt an der Rezeptseite, plus
> ein **app-weiter Timer**. Reines Frontend, vollständig mit den Mock-Daten
> (`src/mocks`) baubar — kein Backend, keine Persistenz.

Dies ist das **konkrete Spec-Sheet** für die Umsetzung. Alle Produkt-/UX-
Entscheidungen sind getroffen; Offenes steht explizit unter
[„Bewusst nicht in Phase 3"](#13-bewusst-nicht-in-phase-3). Voraussetzung:
[Phase 1 — Rezepte ansehen](./phase-1-rezepte-ansehen.md) (Liste + Detail) ist
gemergt.

## Ziel

Wer mit einem offenen Rezept am Herd steht, soll **ohne Editieren** die drei
häufigsten Koch-Handgriffe machen können:

- **Mengen umrechnen** — „ich koche die doppelte Menge" → Zutaten skalieren live.
- **Überblick behalten** — schon erledigte Zutaten **abhaken**.
- **Display offen halten** — der Bildschirm soll während des Kochens nicht
  ausgehen.

Dazu, **rezept-übergreifend**, mehrere parallele **Küchen-Timer** mit Alarm.

Bewusst **kein** erzwungener Schritt-für-Schritt-Durchlauf: Schritte sind ein
flaches `string[]` ohne Schritt↔Zutat-Verknüpfung, beim Kochen springt man
ohnehin — ein Einzelschritt-Modus brächte hier keinen Mehrwert (siehe §13).

## Nicht-Ziele (Scope-Grenzen)

- **Kein** separater Koch-Modus / **keine** neue Route. Alles erweitert die
  bestehende Detailseite `/recipes/:id` in-place; der Timer ist global.
- **Keine Persistenz** (kein `localStorage`, keine URL-Params). Aller Koch-State
  lebt nur im Speicher; Reload und Wegnavigieren von einem Rezept setzen den
  rezept-bezogenen State zurück. Laufende Timer überleben **Navigation**, aber
  **nicht** Reload.
- **Kein** Schritt-für-Schritt-Durchlauf.
- **Keine** rezept-voreingestellten Timer (Schritt-Daten geben keine Zeiten her —
  Schema-Frage, siehe §13 und `../plan.md`).
- **Kein** Editieren von Mengen/Schritten, kein Rating-Abgeben, keine
  Einkaufsliste (Phase 4 / später).

---

## 1. Architektur-Überblick

| Stück | Verortung | State-Reichweite |
|---|---|---|
| Portionen-Faktor | Detailseite (`RecipeDetail`) | pro Rezept, in-memory, Reset bei Unmount |
| Zutaten abhaken | Detailseite (`RecipeDetail`) | pro Rezept, in-memory, Reset bei Unmount |
| Bildschirm anlassen | Detailseite (Steuer-Zeile) | bestehender `useWakeLock` |
| Timer | **global** (`TimerProvider` an der App-Wurzel) | app-weit, überlebt Navigation, **nicht** Reload |

Drei der vier Features sind **rezept-lokaler React-State** in `RecipeDetail`. Der
**Timer** ist das einzige globale Stück: ein Context-Provider oberhalb von Nav
**und** Routen, damit der Timer-Auslöser im Nav lebt und die Timer beim
Navigieren weiterlaufen.

`src/App.tsx` wird so umgebaut, dass `TimerProvider` direkt in `TooltipProvider`
sitzt und **sowohl `Nav` als auch `main`** umschließt; zusätzlich wird der
Sonner-`<Toaster />` (für Timer-Alarme) an der Wurzel gemountet (heute ist
**keiner** vorhanden). Skizze:

```tsx
<TooltipProvider>
  <TimerProvider>
    <div className="flex min-h-screen flex-col …">
      <Nav />
      <main>
        <CatalogProvider>   {/* unverändert — RecipeList hängt daran */}
          <Routes>…</Routes>
        </CatalogProvider>
      </main>
      <Footer />
    </div>
    <Toaster />   {/* sonner; einmal global */}
  </TimerProvider>
</TooltipProvider>
```

> **Nur** `TimerProvider` (um Nav+`main`) und `<Toaster />` kommen neu hinzu —
> `CatalogProvider` bleibt **unverändert** innerhalb `main` um die `Routes` (sonst
> bricht die Liste). Beim Umbau von `App.tsx` nichts Bestehendes entfernen.

---

## 2. Portionen-Faktor (Detailseite)

### Modell — reiner Multiplikator

Skaliert wird über einen **reinen Faktor**, Default **× 1**.
`recipe.basePortionMultiplier` wird **ignoriert** (bewusst — siehe Begründung
unten). Eingabe `0,5` halbiert alle Mengen, `1,5` multipliziert mit 1,5, `2`
verdoppelt. Der Faktor ist **rezept-übergreifend uniform**: „4 Portionen",
„12 Stück", „26 cm Springform" und `amount: null` verhalten sich identisch — es
wird nur die Zutaten-Menge multipliziert, die Meta-Angabe selbst bleibt
unangetastet.

> **Warum reiner Faktor statt Portionen-Eingabe:** uniform für alle Rezepte
> (keine Heuristik „ist das portionsartig?"), kein Parsen der Meta-Angabe, kein
> `basePortionMultiplier` nötig, und Default × 1 ist nicht verwirrend (eine
> Vorbelegung mit der Basisportionszahl wäre es). Ein optionaler „ergibt ~N
> Portionen"-Hinweis kann später nachgerüstet werden — siehe §13.

### Was skaliert wird

**Ausschließlich** `RecipeIngredient.amount`. Berechnung ist eine **Multiplikation
ohne Parsing-Logik**: `amount` ist im Datenmodell die reine Zahl (Präfix in
`amountPrefix`, Einheit in `unit` — siehe [§Datenmodell](#datenmodell--kontrakte)).

- `amount === null` → Zeile unverändert (reine Freitext-Zutat o. ä.).
- `amount` ist **nicht** als Zahl interpretierbar → Zeile unverändert (defensiv,
  falls echte Backend-Daten doch mal etwas Nicht-Numerisches liefern).
- sonst: `Number × Faktor`, Ausgabe mit **deutschem Komma**, **max. 2
  Nachkommastellen**, getrimmte Null-Nachkommastellen (`750`, `0,5`, `1,25`).

**Nie angefasst:** Meta-Zeile (`recipe.amount`, `time`), Notizen, Section-Namen,
Schritte. (Mengen im Schritt-Fließtext lassen sich nicht zuverlässig
mitskalieren — bewusst außen vor.)

### Steuerung — `PortionScaler`

Sitzt in der Steuer-Zeile **rechtsbündig, genau unter der size-Angabe** der
Meta-Zeile (Layout siehe §5). Zustände:

- **Ruhe (Faktor = 1):** kleine, **borderlose** Pille „**× 1**" mit Skalier-Icon
  (lucide, z. B. `Scale` oder `Calculator`), gedämpft. **Tooltip** (postxl
  `Tooltip`): „Mengen skalieren". On **hover** → Border + dezenter Shadow
  (Affordance, dass es klickbar ist).
- **Bearbeiten (Klick):** wird zu einem inline editierbaren Feld (postxl `Input`),
  vorbelegt mit dem aktuellen Faktor. Komma **und** Punkt als Dezimaltrenner
  akzeptiert. Commit bei `Enter`/`blur`, Abbrechen bei `Escape`.
- **Aktiv (Faktor ≠ 1):** Pille zeigt „**× 1,5**". On **hover** erscheint ein
  kleiner **„×"**-Button zum **Zurücksetzen** (zurück auf × 1, Original-Mengen).
- **Reset** = eine von: „×"-Button klicken · Feld leeren · `1` eingeben · `0`
  eingeben. Negative/ungültige Eingaben werden ignoriert (Faktor bleibt unverändert).

Der Faktor wird als `number` im `RecipeDetail`-State gehalten und an jede
`IngredientLine` durchgereicht (Prop `factor`, Default 1).

---

## 3. Zutaten abhaken (Detailseite)

Ein **Toggle „Abhaken"** in der Steuer-Zeile (links, siehe §5):

- **Aus (Default):** saubere Phase-1-Leseansicht — **keine** Checkboxen.
- **An:** vor **jeder Zutatenzeile** erscheint eine postxl `Checkbox`. Angehakt =
  Zeile **durchgestrichen** (`line-through`) **und gedimmt** (`text-muted-foreground`
  / reduzierte Opazität).
- Gilt **nur für Zutaten**, nicht für Schritte.
- **State:** ein `Set<RecipeIngredientId>` der angehakten Zeilen im
  `RecipeDetail`-State. Toggle-**aus** blendet die Checkboxen nur **aus**, behält
  die Häkchen aber für die Session; Rezeptwechsel/Reload setzt zurück (kein
  Persist).
- Toggle ist ein postxl `Toggle`/`Button` mit `aria-pressed`; Label/Icon (lucide
  `ListChecks` o. ä.) + Text „Abhaken". Tooltip optional.

---

## 4. Bildschirm anlassen (Wake-Lock)

Der bestehende `WakeLockToggle` (`src/components/WakeLockToggle.tsx`, getrieben
von `useWakeLock`) wird **aus dem globalen Nav entfernt** und in die Steuer-Zeile
der Detailseite verschoben (links, neben „Abhaken") — genau wie es
`docs/backlog.md` vorsah.

- Bleibt **manueller** Toggle (kein Auto-Einschalten beim Öffnen).
- **Wird unverändert wiederverwendet:** `WakeLockToggle` ist heute **icon-only**
  (eigene `MugIcon`-SVG, `size="icon"`, Label via Tooltip — kein sichtbarer Text).
  So bleibt es; **die Text-Labels in den Layout-Skizzen unten sind illustrativ**.
  Der „Abhaken"-Toggle darf icon+Tooltip (kompakt) **oder** icon+Text sein —
  Implementierer-Wahl, konsistent mit dem Wake-Lock-Icon daneben.
- Versteckt sich weiterhin selbst, wenn die Wake-Lock-API nicht unterstützt wird
  (`supported === false` → `return null`).
- `src/components/Nav.tsx`: `WakeLockToggle`-Import/-Verwendung raus; an die
  freiwerdende Stelle kommt der **Timer-Auslöser** (§6).

---

## 5. Detailseiten-Layout (Meta + Steuer-Zeile)

Die heutige Meta-Zeile in `RecipeDetail` (`★ Rating · 🕒 Zeit · size`, mit size
rechtsbündig) bleibt als **reine Info** erhalten. **Direkt darunter** kommt eine
neue **Steuer-Zeile**:

```
Spaghetti Bolognese                         #Hauptgericht #Italienisch
★ 4,5      ·      🕒 45 min      ·      4 Portionen          ← Meta (Info)
[☑ Abhaken]  [🍵 Bildschirm anlassen]                [⬢ × 1]  ← Steuer-Zeile
```

- **Links:** Werkzeug-Toggles `Abhaken` und `Bildschirm anlassen`.
- **Rechts (unter der size):** der `PortionScaler`.
- Umsetzung als Flex-Row mit `justify-between` (Toggles als linke Gruppe, Scaler
  rechts). Auf schmalen Breiten darf die Zeile umbrechen, Scaler bleibt der
  size optisch zugeordnet.
- Die Steuer-Zeile erscheint **immer** (auch wenn `recipe.amount` null ist —
  dann steht der Scaler trotzdem rechts und skaliert die Zutaten als reiner
  Faktor).

---

## 6. Timer (global)

### Reichweite & Lebensdauer

- **App-weit**, einem `TimerProvider`-Context an der Wurzel zugeordnet — **keinem**
  Rezept. Timer laufen beim Navigieren zwischen Seiten **weiter**.
- **Nicht** persistiert: ein Reload verwirft laufende Timer (akzeptabel; später
  über End-Timestamps nachrüstbar — siehe §13).
- **Genauigkeit:** Restzeit wird aus einem **absoluten End-Zeitpunkt** berechnet
  (nicht durch Hochzählen pro Tick), damit gedrosselte Hintergrund-Tabs die Zeit
  nicht verfälschen. Ein einzelnes Intervall (≈250 ms) treibt die Anzeige.

### Auslöser im Nav

An der durch den entfernten Wake-Lock (§4) frei gewordenen Stelle im `Nav`:

- Ein **Icon-Toggle** (lucide `Timer`/`AlarmClock`), öffnet das Timer-Panel.
- **Daneben**, klein, die **Restzeit des als-nächstes ablaufenden** laufenden
  Timers (`mm:ss`, bzw. `h:mm:ss` ≥ 1 h) — **nur** wenn ≥ 1 Timer läuft; sonst
  nur das Icon.
- Läuft ein Timer ab und alarmiert, zeigt der Auslöser einen aktiven/alarmierten
  Zustand (z. B. eingefärbt), bis der Alarm gestoppt ist.

### Panel — `Sheet` (Desktop) / `Drawer` (mobil)

Öffnet als seitliches postxl `Sheet` (Desktop, von rechts) bzw. `Drawer` (mobil,
von unten). Desktop/Mobil-Unterscheidung über den **`useIsMobile`**-Hook aus
`@postxl/ui-components` (vorhanden). Inhalt:

1. **Liste laufender/abgelaufener Timer** (`TimerRow` je Timer), neuester oben
   oder nach Restzeit sortiert (Implementierer-Wahl, konsistent).
2. **„Timer hinzufügen"** (`TimerForm`).

Leerer Zustand: freundlicher Hinweis „Kein Timer läuft".

### `TimerRow` (ein Timer)

- **Name** (falls gesetzt) + **Countdown** (`mm:ss` / `h:mm:ss`).
- Aktionen: **Pause/Fortsetzen**, **Neustart** (auf Ausgangsdauer), **Löschen**.
  Alle als postxl `Button size="icon"` mit lucide-Icons + Tooltip.
- **Abgelaufen:** Zeile **blinkt** (Alarm-Hervorhebung) und zeigt „**Stopp**";
  Stopp beendet Ton/Vibration und markiert den Timer als erledigt (Eintrag bleibt
  bis zum Löschen sichtbar, ohne weiteren Alarm).

### `TimerForm` (Anlegen)

- **Name** (optional, postxl `Input`), Default leer → Anzeige „Timer".
- **Schnellwahl-Chips:** `1 min · 3 min · 5 min · 10 min · 15 min` (postxl
  `Button`/`Badge`-Toggles). Ein Chip setzt die Dauer im Picker.
- **`DurationPicker`** (Wheel/Drum, siehe unten) mit Spalten **Std : Min : Sek**.
- **„Timer starten"** (postxl `Button`). **Deaktiviert**, wenn die Gesamtdauer
  `0` ist.
- Default-Dauer beim Öffnen: `0:05:00` (5 min) — ein typischer Küchenwert, sofort
  startbar; per Chips/Picker änderbar.

### `DurationPicker` (neue Custom-Komponente)

Ein Wheel-/Drum-Picker (iOS-Stil) mit **drei vertikal scrollenden Spalten**:
**Std** (0–23, Default 0 / optisch „leer = 0"), **Min** (0–59), **Sek** (0–59).
Es gibt **kein** fertiges postxl-Component dafür → **bewusste Ausnahme** von der
„nur Komponenten-Bibliothek"-Regel (CLAUDE.md erlaubt Eigenbau, wo die Lib eine
Lücke hat). Minimal halten, sauber bauen.

**Bedienung — alle Wege müssen funktionieren:**

- **Scrollen** (Mausrad **und** Touch-Swipe) über einer Spalte verschiebt deren
  Werte; der **zentrierte** Wert ist der gewählte. (Vom Nutzer ausdrücklich
  gewünscht: per Scrollen bedienbar.)
- **Klick** auf einen sichtbaren Wert scrollt ihn in die Mitte (= wählt ihn).
- **Tastatur:** fokussierte Spalte mit `↑`/`↓` ändern; Spaltenwechsel mit `Tab`.

**Umsetzung:** CSS **scroll-snap** (`snap-y snap-mandatory`, via Tailwind-
Utilities) pro Spalte; die Mitte ist durch einen ruhenden Markierungsrahmen
hervorgehoben. Scrollbalken ausblenden (minimaler CSS-Helfer in `styles.css`,
falls Tailwind das nicht abdeckt — sonst nichts Eigenes). `aria-label` je Spalte
(„Stunden"/„Minuten"/„Sekunden"), Werte als fokussierbare Optionen.
`prefers-reduced-motion`: kein smooth-scroll-Auto-Animieren erzwingen.

### Alarm bei Ablauf

Gleichzeitig vier Kanäle (keiner allein verlässlich):

- **Ton:** WebAudio-Piepton (Oszillator) — **kein** Audio-Asset. Der `AudioContext`
  wird durch eine User-Geste entsperrt (Timer-Anlegen/-Starten ist eine).
  **Wiederholt** als kurzes Beep-Muster, **bis** der Nutzer „Stopp" drückt;
  **Sicherheits-Auto-Stopp nach 60 s**.
- **Vibration:** `navigator.vibrate(...)` (mobil; no-op wo nicht unterstützt).
- **Visuell:** der `TimerRow`-Eintrag blinkt; der Nav-Auslöser zeigt den
  Alarm-Zustand. Blinken hinter `prefers-reduced-motion` gaten (dann statische
  starke Hervorhebung statt Animation).
- **Toast:** Sonner-`toast` „Timer ‚Nudeln' abgelaufen" mit Aktion **„Stopp"**.

Mehrere gleichzeitig ablaufende Timer alarmieren **je einzeln** (eigene Zeile,
eigener Toast); ein „Stopp" beendet genau seinen Alarm.

> **Hintergrund-Tab-Hinweis:** Bei verstecktem Tab drosselt der Browser Timer
> und kann den Ton verzögern; Wake-Lock wird ohnehin freigegeben. Das ist eine
> Plattform-Grenze, keine zu behebende Funktion — die Restzeit bleibt durch den
> absoluten End-Zeitpunkt korrekt, nur der Alarm kann später feuern.

---

## 7. Komponenten-/Datei-Inventar

| Datei | Zweck | Neu/Änderung |
|---|---|---|
| `src/timers/TimerProvider.tsx` | globaler Timer-State (Context), Tick, Alarm-Auslösung; `useTimers()` | **neu** |
| `src/timers/TimerToggle.tsx` | Nav-Icon + Restzeit des nächsten Timers; öffnet Panel | **neu** |
| `src/timers/TimerPanel.tsx` | Sheet/Drawer-Inhalt: Liste + Form | **neu** |
| `src/timers/TimerRow.tsx` | ein Timer: Countdown + Pause/Neustart/Löschen + Alarm-Stopp | **neu** |
| `src/timers/TimerForm.tsx` | Anlegen: Name + Chips + `DurationPicker` + Start | **neu** |
| `src/components/DurationPicker.tsx` | Wheel/Drum-Picker (Std:Min:Sek), scroll-/klick-/tastaturbedienbar | **neu** |
| `src/timers/alarm.ts` | WebAudio-Beep + Vibration starten/stoppen (pur, kein React) | **neu** |
| `src/components/recipe/PortionScaler.tsx` | Portionen-Faktor-Pille (Ruhe/Edit/Aktiv) | **neu** |
| `src/api/views.ts` | `+ scaleAmount(amount, factor)` (pur) | **Änderung** |
| `src/components/recipe/IngredientLine.tsx` | Prop `factor` → `scaleAmount` vor dem Zusammensetzen; Prop für Abhak-Checkbox | **Änderung** |
| `src/components/recipe/SectionBlock.tsx` | reicht `factor` + Abhak-State an `IngredientLine` durch | **Änderung** |
| `src/pages/RecipeDetail.tsx` | Faktor- & Abhak-State; Steuer-Zeile (Scaler + Toggles + Wake-Lock) | **Änderung** |
| `src/components/Nav.tsx` | `WakeLockToggle` raus, `TimerToggle` rein | **Änderung** |
| `src/App.tsx` | `TimerProvider` um Nav+Routen; `<Toaster />` mounten | **Änderung** |

Granularität beim Umsetzen anpassen — Leitlinie wie in Phase 1: kleine,
fokussierte Einheiten. Die `src/timers/`-Aufteilung ist ein Vorschlag; der
Implementierer darf zusammenlegen/teilen, solange die Verantwortlichkeiten klar
bleiben.

---

## Datenmodell / Kontrakte

Aus `src/api/protocol.ts` (unverändert — Phase 3 ändert das Schema **nicht**):

```ts
type RecipeIngredient = {
  id: RecipeIngredientId
  ingredient: IngredientRef | null
  text: string | null
  amount: string | null      // reine Zahl als String, z. B. "500"  ← einzig Skaliertes
  amountPrefix: string | null // z. B. "ca."
  unit: string | null         // z. B. "g", "EL"
}
type Recipe = { …; amount: string | null; basePortionMultiplier: number | null; … }
```

**Neuer View-Helfer** (`src/api/views.ts`, pur, kein React, mit Unit-Test):

```ts
// Skaliert die reine Mengen-Zahl eines Zutaten-Strings um `factor`.
// - null bleibt null; nicht-numerisches `amount` bleibt unverändert.
// - factor === 1 → unverändert.
// - sonst: Number(amount) * factor, dt. Komma, max. 2 Nachkommastellen, getrimmt.
// Akzeptiert Komma ODER Punkt als Dezimaltrenner in der Eingabe.
export function scaleAmount(amount: string | null, factor: number): string | null
```

**Timer-Datenform** (interner Client-State, kein Wire-Vertrag):

```ts
type TimerId = string
type TimerStatus = 'running' | 'paused' | 'expired'
type Timer = {
  id: TimerId
  label: string          // '' → Anzeige "Timer"
  durationMs: number     // Ausgangsdauer (für Neustart)
  remainingMs: number    // abgeleitet aus endAt bei 'running'
  endAt: number | null   // absoluter Endzeitpunkt (ms) bei 'running', sonst null
  status: TimerStatus
}
```

`useTimers()` exponiert: `timers`, `add({label, durationMs})`, `pause(id)`,
`resume(id)`, `restart(id)`, `remove(id)`, `stopAlarm(id)`, sowie
`nextRemainingMs` (Restzeit des als-nächstes ablaufenden Timers für den
Nav-Badge).

---

## Edge cases & Fehlerverhalten

- **`amount` nicht numerisch / `null`** beim Skalieren → Zeile bleibt unverändert
  (kein „NaN").
- **Faktor 0 / leer / 1 / negativ** → als Reset bzw. „ignorieren" behandelt
  (Faktor bleibt ≥ 0; effektiv × 1 = Original).
- **Rezept ohne skalierbare Mengen** (alle `amount` null) → Scaler ist trotzdem
  bedienbar, ändert sichtbar nichts. Kein Fehler.
- **`recipe.amount === null`** → Steuer-Zeile + Scaler erscheinen trotzdem
  (Scaler rechts), Meta zeigt keine size.
- **Wake-Lock nicht unterstützt** → Toggle rendert nicht (`null`), Steuer-Zeile
  zeigt dann nur „Abhaken".
- **Timer-Dauer 0** → „Timer starten" deaktiviert.
- **Mehrere Timer laufen ab** → je eigener Alarm/Toast; „Stopp" wirkt pro Timer.
- **Audio blockiert** (kein vorheriger Gesten-Unlock o. ä.) → Ton entfällt
  geräuschlos; visueller Alarm + Toast + Vibration greifen weiter.
- **Tab im Hintergrund** → Countdown bleibt korrekt (absoluter End-Zeitpunkt),
  Alarm ggf. verzögert (Plattform-Grenze, dokumentiert).
- **Reload** → rezept-lokaler State und Timer sind weg (kein Persist — by design).

---

## Akzeptanzkriterien

- [ ] **AC1** — `scaleAmount` skaliert korrekt und formatiert deutsch: `("500",2)
  → "1000"`, `("500",0.5) → "250"`, `("1",1.5) → "1,5"`, `(null,2) → null`,
  `("etwas",2) → "etwas"`, `("500",1) → "500"`.  → _verifiziert durch:_ Vitest in
  `src/api/views.test.ts`.
- [ ] **AC2** — Auf der Detailseite skaliert das Setzen eines Faktors ≠ 1 **alle
  numerischen** Zutaten-Mengen live; Meta-Zeile, Notizen und Schritte bleiben
  unverändert.  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC3** — Der `PortionScaler` zeigt im Ruhezustand „× 1", bei aktivem Faktor
  „× <faktor>" (dt. Komma); Reset (×-Button / leeren / `1`) stellt die
  Original-Mengen wieder her.  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC4** — Der „Abhaken"-Toggle blendet Checkboxen pro Zutat ein/aus;
  Anhaken streicht die Zeile durch und dimmt sie; ausgeschaltet ist die
  Leseansicht checkbox-frei.  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC5** — „Bildschirm anlassen" steht in der Detail-Steuer-Zeile und **nicht
  mehr** im globalen Nav; der Toggle funktioniert (bzw. ist bei fehlendem Support
  ausgeblendet).  → _verifiziert durch:_ Chrome-MCP + Code-Sicht (`Nav.tsx`).
- [ ] **AC6** — Layout: Meta-Zeile (Rating · Zeit · size) als Info; darunter
  Steuer-Zeile mit Toggles links und Scaler rechts unter der size.  →
  _verifiziert durch:_ Chrome-MCP (Screenshot/Position).
- [ ] **AC7** — Ein Timer-Icon im Nav öffnet das Sheet/Drawer; ein angelegter
  Timer zählt herunter, und die Restzeit des nächsten Timers erscheint klein
  neben dem Nav-Icon.  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC8** — `DurationPicker` ist per **Mausrad-Scroll**, **Klick** und
  **Tastatur** bedienbar; Spalten Std:Min:Sek; Chips setzen die Dauer.  →
  _verifiziert durch:_ Chrome-MCP (Scroll + Klick), Tastatur-Fokus.
- [ ] **AC9** — Pro Timer funktionieren Pause/Fortsetzen, Neustart und Löschen.
  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC10** — Bei Ablauf: Toast mit „Stopp", blinkender Eintrag, Nav-Alarm-
  Zustand; „Stopp" beendet den Alarm. (Ton/Vibration best-effort, nicht
  headless-prüfbar.)  → _verifiziert durch:_ Chrome-MCP (Toast/Visuell), kurzer
  Test-Timer (z. B. 2–3 s).
- [ ] **AC11** — Timer überleben **Navigation** (Liste ↔ Detail) und werden bei
  **Reload** verworfen.  → _verifiziert durch:_ Chrome-MCP.
- [ ] **AC12** — `npm run build` (tsc + vite) ist fehlerfrei; `npm test` grün; die
  Detailseite wirft keine Konsolenfehler.  → _verifiziert durch:_ Befehle +
  Chrome-MCP-Konsole.

---

## Verifikationsplan

Konkret, in dieser Umgebung ausführbar.

- **Automatisiert (Unit):** `npm test` — neue `scaleAmount`-Fälle in
  `src/api/views.test.ts` (AC1) müssen grün sein, alle bestehenden Tests bleiben
  grün. (Optional ein leichter Test für die Timer-Reducer-Logik, soweit pur
  herausziehbar.)
- **Build/Typecheck:** `npm run build` — fehlerfrei (AC12).
- **Praktisch (Chrome MCP) am dev-Server mit Mocks:** `VITE_MOCK=1 npm run dev`
  (Standard-Port `http://localhost:5173`). Über die Chrome-MCP-Tools (kein
  Playwright-Browser-Agent — CLAUDE.md):
  1. `/recipes/1` öffnen. Steuer-Zeile prüfen: Toggles links, „× 1"-Pille rechts
     unter der size (AC6). Eine numerische Zutaten-Menge merken.
  2. Faktor `2` setzen → Menge verdoppelt, Pille „× 2", Meta/Notizen/Schritte
     unverändert (AC2, AC3). Reset → Original (AC3).
  3. „Abhaken" an → Checkboxen; eine anhaken → durchgestrichen+gedimmt; aus →
     keine Checkboxen (AC4).
  4. Wake-Lock-Tasse ist in der Steuer-Zeile, nicht im Nav (AC5). Nav zeigt
     stattdessen das Timer-Icon.
  5. Timer-Icon → Sheet/Drawer. Im `DurationPicker` per **Scrollen** und **Klick**
     eine Dauer wählen, Chip testen, Timer starten (z. B. 3 s) (AC7, AC8).
     Restzeit erscheint neben dem Nav-Icon.
  6. Pause/Fortsetzen/Neustart/Löschen an einem Timer (AC9).
  7. Kurzen Timer ablaufen lassen → Toast „Stopp", blinkender Eintrag,
     Nav-Alarm; „Stopp" beendet ihn (AC10). (Ton/Vibration nur manuell/real
     prüfbar — als Hinweis vermerken.)
  8. Während ein Timer läuft zur Liste (`/`) und zurück navigieren → Timer läuft
     weiter (AC11). Danach Reload → Timer weg (AC11).
  9. Konsole ohne Fehler (AC12).

---

## UI-/Styling-Konventionen (aus CLAUDE.md — bindend)

- Interaktive Elemente **ausschließlich** über `@postxl/ui-components`
  (`Button`, `Checkbox`, `Toggle`, `Input`, `Sheet`, `Drawer`, `Badge`,
  `Tooltip`, Sonner-`Toaster`/`toast`, …) — keine rohen `<button>`/`<input>`.
  **Einzige bewusste Ausnahme:** der `DurationPicker` (kein Component dafür) —
  minimal & sauber, mit a11y.
- **Tooltips** immer via postxl `Tooltip` (`TooltipTrigger asChild` +
  `TooltipContent`), **nie** `title=""`. Provider liegt schon global in `App.tsx`.
- Größen/Look über `size`/`variant`-Props, nicht in Tailwind nachbauen.
- **Tailwind-first, keine Inline-Styles.** Arbitrary values erlaubt. CSS nur, wo
  Tailwind es nicht kann (hier ggf. Scrollbar-Ausblenden im `DurationPicker`) —
  minimal in `styles.css`, keine Utilities nachbauen.
- Icons aus `lucide-react`.
- **Animationen & `prefers-reduced-motion`:** Alarm-Blinken und Auto-Smooth-Scroll
  hinter Reduced-Motion gaten (statische starke Hervorhebung als Fallback).
- Border-Konventionen aus `styles.css` (v3-`border-color`-Default) beachten.

Volle Regeln: `CLAUDE.md`.

---

## 13. Bewusst nicht in Phase 3

- **Schritt-für-Schritt-Durchlauf** — bewusst verworfen (flaches `string[]`, keine
  Schritt↔Zutat-Verknüpfung; man springt beim Kochen ohnehin).
- **Rezept-/Schritt-voreingestellte Timer** (ein Schritt startet seinen Timer per
  Tap) — **Schema-Frage**: Schritte tragen heute keine Zeit-/Dauer-Daten; bräuchte
  strukturierte Schritte (z. B. `duration` pro Schritt). Notiert in `../plan.md`
  unter „Daten-/Protokoll-Fragen". Phase 3 macht nur **manuelle, rezept-
  unabhängige** Timer.
- **Persistenz** (Reload-feste Timer via End-Timestamps, klebrige Häkchen/Faktor
  pro Rezept) — kein `localStorage` in Phase 3.
- **„Ergibt ~N Portionen"-Hinweis** aus `basePortionMultiplier` neben dem Faktor —
  möglicher späterer Komfort, jetzt bewusst weggelassen (reiner Faktor).
- **Skalieren von Mengen im Schritt-Fließtext** — nicht zuverlässig parsebar.
- **Mengen editieren / Rating abgeben / Einkaufsliste** — Phase 4 / später.

---

## Implementation Workflow (für den umsetzenden Agenten)

Du bist ein **frischer Agent**. Diese Datei ist dein vollständiger Auftrag. Setze
das Spec oben um, indem du diese Schritte **der Reihe nach** befolgst. Überspringe
die Reviews nicht und nutze für **jedes Review einen frischen Subagenten** (frische,
unvoreingenommene Augen).

0. **Lesen & Plausibilitätscheck.** Lies das ganze Spec. Ist etwas mehrdeutig oder
   widerspricht dem Code, **stopp und frag**, bevor du Code schreibst.
1. **Plan.** Erstelle einen konkreten, schrittweisen Umsetzungsplan (Dateien,
   Reihenfolge, Risiken). Schreib ihn neben dieses Spec
   (`phase-3-koch-modus.plan.md`).
2. **Plan-Review.** Schicke einen frischen Subagenten, den Plan gegen dieses Spec
   zu prüfen — Lücken, falsche Annahmen, verpasste Akzeptanzkriterien, riskante
   Schritte. Behebe jeden relevanten Befund.
3. **Umsetzen.** Schicke einen frischen Subagenten, den (korrigierten) Plan
   Schritt für Schritt umzusetzen, im Einklang mit den Projekt-Konventionen. Wo
   der Code bereits Ähnliches hat (z. B. `IngredientLine`, `WakeLockToggle`,
   bestehende Tests), nutze es als Vorlage statt neue Formen zu erfinden.
4. **Umsetzungs-Review.** Schicke einen frischen Subagenten (frische Augen — hat
   die Umsetzung nicht gesehen) für ein Diff-Review gegen Plan und Spec.
5. **Beheben & Schleife.** Behebe jeden relevanten Befund aus Schritt 4.
   Wiederhole 3–4, bis ein Review **keine relevanten Befunde** mehr liefert.
6. **Abgleich mit diesem Spec.** Gehe die **Akzeptanzkriterien** oben einzeln
   durch. Markiere jedes ✅ / ❌ mit Beleg. Jedes ❌ → zurück zu Schritt 3.
7. **Praktische Verifikation.** Führe den **Verifikationsplan** oben real aus —
   Tests, Build, Chrome MCP. Sichere die Belege (Output, Screenshots,
   Assertions). Schlägt etwas fehl → zurück zu Schritt 3.
8. **Finaler unabhängiger Check.** Schicke einen frischen Agenten — einen, der an
   **keinem** vorherigen Schritt beteiligt war — der das fertige Ergebnis
   end-to-end gegen dieses Spec prüft (Vier-Augen-Gate). Behebe Gefundenes,
   verifiziere erneut.
9. **Fertig.** Erst wenn jedes Akzeptanzkriterium ✅ ist, die Verifikation grün ist
   und der finale Check bestanden wurde. Bericht mit Belegen — keine
   unbelegten „läuft"-Aussagen.
