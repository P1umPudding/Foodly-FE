# 0002 — Eine Farbe pro Kategorie, Varianten in TypeScript berechnet

**Status:** angenommen (Kolja, 2026-10-29) · Umsetzung offen (Worker-Issue „Kategorie-Farb-Util“)

## Kontext

Kategorien sind persönliche Sammlungen (`UserCategory`, 0 bis n pro Rezept). Das
Redesign „Ruhig“ (`docs/design/redesign/README.md` §1.3) braucht pro Kategorie
fünf Farbrollen (`dot`, `soft`, `ink`, `line`, `solid`), lesbar in Hell und Dunkel,
für jede beliebige Nutzerfarbe. Heute bildet `src/list/palette.ts` nur bekannte
Hex-Werte auf feste Tailwind-Klassen ab. Unbekannte Farben werden neutral. Das
Backend hat `color` sowie optional `colorLight`/`colorDark`.

## Entscheidung

- **Eine Farbe pro Kategorie.** Der Nutzer wählt nur `color`. Die Varianten für
  Hell und Dunkel berechnet Foodly.
- **Berechnung in TypeScript**, als reine Funktion in `src/lib/categoryColor.ts`
  mit Unit-Tests. Sie normalisiert in OKLCH: Die Helligkeit ist pro Theme und
  Rolle fest, die Sättigung gedeckelt, der Farbton bleibt erhalten. Werte stehen in
  README §1.3. Die Ausgabe ist ein sRGB-Hex-Wert, auf den sRGB-Farbraum begrenzt.
  Keine CSS Relative Color Syntax, weil ältere WebViews (Capacitor, Phase 7) sie
  nicht sicher können.
- **Overrides:** Ist `colorLight` bzw. `colorDark` gesetzt, ersetzt der Wert
  unverändert die Rolle `dot` im jeweiligen Theme. Die übrigen Rollen kommen weiter
  aus dem Farbton von `color`. Im UI gibt es dafür vorerst keine eigene Eingabe.
- **Brücke ins CSS:** Ein Element, das eine Kategorie darstellt, setzt die
  berechneten Werte als CSS-Variablen (`--cat-<rolle>-l`, `--cat-<rolle>-d`). Das
  läuft über **einen** Helper bzw. eine Komponente und ist die einzige erlaubte
  Ausnahme von der Regel „keine Inline-Styles“: nur Custom Properties, keine
  Eigenschaften. `styles.css` wählt einmal generisch pro Theme
  (`--cat-dot: var(--cat-dot-l)`, unter `.dark`: `var(--cat-dot-d)`). Komponenten
  nutzen nur Tailwind-Utilities wie `bg-(--cat-dot)` oder `text-(--cat-ink)`.
- `src/list/palette.ts` wird durch das Util ersetzt.
- Grau, Schwarz und Weiß (sehr niedrige Sättigung) ergeben eine neutrale graue
  Kategorie. Das Util liefert außerdem die Farbvorschläge (12 Farbtöne) und einen
  Abstands-Check der Farbtöne für die spätere Warnung unter etwa 20°.

## Konsequenzen

- Jede Nutzerfarbe wird lesbar. Die Kontraste testet die Unit-Suite gegen die
  Testfarben aus README §1.3.
- Navy und Hellblau sehen sich ähnlich, weil die Helligkeit angeglichen wird. Das
  fangen die Farbvorschläge und die Warnung beim Anlegen ab.
- `CLAUDE.md` und `docs/architecture.md` nennen die Inline-Ausnahme für `--cat-*`.
- Ein Theme-Wechsel braucht kein JS, denn beide Varianten stehen schon am Element.
