# Kachel-Skelette: Platz für Titel- und Meta-Zeile (#124)

**Ziel:** Ein Kachel-Skelett ist so hoch wie eine typische Foto-Kachel (Foto, einzeiliger Titel, Meta-Zeile, keine Kategorie-Zeile), damit die Rasterzeilen beim Eintreffen der Rezepte nicht springen.

## Umsetzung
- `RecipeTile.tsx` exportiert die Textklassen von Titel und Meta-Zeile (`TILE_TITLE_TEXT`, `TILE_META_TEXT`) und nutzt sie selbst.
- `RecipeList.tsx`: `TileSkeleton` spiegelt den Aufbau von `RecipeTile` — Wrapper `flex flex-col gap-2` (`data-testid="tile-skeleton"`), 4:3-`Skeleton`, darunter `flex flex-col gap-0.5` mit zwei Balken (`h-4 w-3/4 rounded-sm`, `h-3 w-1/2 rounded-sm`, `data-testid="tile-skeleton-line"`).
- Jeder Balken sitzt zentriert in einer Zeilenbox `h-lh` mit der Textklasse der echten Zeile. So folgt die Höhe den Text-Tokens: unter dem 4:3-Block 8 + 21,25 + 2 + 18 = 49,25 px (Desktop) bzw. 8 + 18,75 + 2 + 16 = 44,75 px (Handy) — wie die Kachel.
- `ListSkeleton` nutzt `TileSkeleton` im Kachelmodus; damit gilt es für Erstladen, Warten auf Kategorien, „pending“ und das Nachlade-Skelett (`oneRow`). Zeilen-Skelette unverändert.

## Tests
`RecipeList.search.test.tsx`: Struktur (4:3-Block + zwei Balken) je Kachel-Skelett, 8 Balken im Nachlade-Skelett; bestehende Zählungen unverändert.

## Bekannte Grenzen
Zeilen mit zweizeiligem Titel, Kategorie-Zeile (flache Ansicht), umbrechender oder leerer Meta-Zeile sowie Kacheln ohne Foto weichen weiterhin etwas ab.
