# Plan: Test-Laufzeit halbieren mit vmThreads (#298)

Spec: `.git/agent-work/spec.md` (= Issue #298 + Annahmen A1–A7). Ziel: voller `npm test`-Lauf ≤ 50 % der heutigen Zeit, ohne Tests zu verlieren oder flaky zu machen; nur Test-Konfiguration.

## Messung (Spike, Sandbox mit 2 vCPU, `npx vitest run`)

| Variante                                     | Dateien/Tests                                         | Dauer (vitest) | Anteil |
| -------------------------------------------- | ----------------------------------------------------- | -------------- | ------ |
| `main` (Default-Pool `forks`, isoliert)      | 177 / 2037 grün                                       | 714,6 s        | 100 %  |
| `--no-isolate` (`forks`)                     | Kaskade (AppShell 59/59, FilterBar 37/37 rot …), nach ~20 min abgebrochen | –              | –      |
| Teilmenge `src/pages` (32 Dateien): forks / threads / vmThreads | 338 grün                           | 213 / 207 / 77 s | –    |
| `--pool=vmThreads`, voller Lauf              | 177 / 2037 grün                                       | 166,4 s        | 23 %   |

Absolute Zahlen hängen von der Maschine ab; entscheidend ist der relative Gewinn.

## Entscheidung

`pool: 'vmThreads'` statt `isolate: false` (erste Wahl im Issue). 75 Testdateien nutzen `vi.mock` (u. a. `react-router-dom`, `CatalogProvider`, `useIsDesktop`, `AppShell`), 13 `vi.resetModules`. Mit geteiltem Modulgraphen landen Mocks einer Datei in Modulen, die eine andere Datei schon geladen hat, z. B. zwei react-router-Instanzen („useNavigate() may be used only in the context of a <Router>“). Das ließe sich nur durch einen Umbau großer Teile der Mock-Strategie lösen und ist kein Zustand, den `setup.ts` zurücksetzen kann.

`vmThreads` lässt jede Datei in einem frischen `vm`-Kontext laufen: Mocks und Modul-Singletons bleiben pro Datei isoliert, die Kosten pro Datei für Worker, Environment und Importe aus `node_modules` entfallen aber (Import 51 % → 13 %, Environment 19 % → 2 %). Laut vitest-5-Typen hat `isolate` bei `vmThreads` keine Wirkung, deshalb wird es nicht gesetzt.

`vmMemoryLimit: '1024MB'`: vitest setzt den Default als Anteil des Host-RAM (hier 32 GB), nicht des Containers (cgroup 4 GB). Ohne Grenze wächst der eine Worker auf ~1,76 GB Heap; mit Grenze wird er recycelt, Spitze ~1 GB, gleiche Laufzeit (168,9 s).

`CatalogProvider.test.tsx`: Der Shuffle-Lauf (Seed 29811) fand eine vorbestehende Race. Der Probe mountet erst, wenn Tags, me und Zutaten geladen sind; die Tests suchten den `refresh`-Button aber direkt nach dem ersten Kategorien-Aufruf. `renderCategories()` wartet jetzt auf den Probe.

Bewusst nicht geändert: `src/test/setup.ts` und Tests (A4/A5 entfallen, weil die Isolation bleibt), `restoreMocks`/`unstubEnvs`/`unstubGlobals` (A6, würde die Testsemantik ohne Not ändern), `deps.web.transformCss`/`transformAssets` (nur unter vmThreads, Default `true`, Lauf grün), `vmForks` (nicht nötig).

## Schritte

1. `vite.config.ts`, `test`-Block: `pool: 'vmThreads'` und `vmMemoryLimit` mit kurzem Warum-Kommentar; Race in `CatalogProvider.test.tsx` beheben.
2. Dieser Plan unter `docs/superpowers/plans/`.
3. Prüfen:
   - AC1: voller `npm test`, 177 Dateien / 2037 Tests grün.
   - AC2: Dauer vorher/nachher im PR (Ziel ≤ 357 s).
   - AC3: drei volle Läufe nacheinander grün, dazu ein Lauf mit `--sequence.shuffle` (Seed notieren; schlägt er fehl, mit demselben Seed auf `--pool=forks` gegenprüfen, sonst ist es eine vorbestehende Reihenfolgeabhängigkeit innerhalb einer Datei → im PR nennen).
   - AC4: kein Test gelöscht oder übersprungen; erfüllt, weil die Isolation pro Datei bleibt.
   - Speicher: ein Lauf mit `--logHeapUsage`, Spitzenwert in den PR.
   - Watch-Modus: `npx vitest --watch <datei>` startet und läuft grün.
   - AC5: `npm ci`, `npm run build`, `npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`.
4. Commits: `Tests: vmThreads-Pool halbiert die Laufzeit (#298)`, dann Speichergrenze und Race-Fix.
