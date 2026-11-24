# 0005 — Native Hülle mit Capacitor

Status: angenommen (Daniel, 2026-11-23)

## Kontext

Phase 7 bringt Foodly als App auf Android und iOS
(`docs/superpowers/specs/2026-11-23-phase-7-native-app-design.md`). Die App soll dieselbe SPA bleiben, ohne zweite
Codebasis. Gleichzeitig darf das Web nicht schwerer werden: Der Entry-Chunk liegt schon am Limit
(`chunkSizeWarningLimit` in `vite.config.ts`).

## Entscheidung

- **Capacitor 8** verpackt den Vite-Build (`dist/`) in native Projekte. `android/` und `ios/` (Swift Package Manager)
  liegen im Repo; `npm run cap:sync` baut mit `--mode native` und synchronisiert beide.
- **`src/native/` ist die einzige Stelle für native APIs.** Komponenten, Hooks und `src/api` rufen nur die Adapter dort
  auf. ESLint (`no-restricted-imports`) verbietet statische Importe von `@capacitor/*` und `@capacitor-community/*`
  außerhalb von `src/native/`.
- **Plugins werden dynamisch importiert.** `platform.ts` liest das von der Hülle injizierte `window.Capacitor` statt
  `@capacitor/core` zu importieren; Adapter laden ihr Plugin per `import()`, erst wenn `isNative()` gilt. Dynamische
  Importe prüft die Lint-Regel nicht, sie gehören per Konvention ebenfalls nach `src/native/`.
- **Das Web bleibt Primärziel.** Jede native Funktion ist ein Zusatz mit Web-Verhalten als Standard; ohne Hülle ändert
  sich nichts.
- Der native Build ist ohne erreichbares Backend ein **Mock-Build** (`.env.native`: `VITE_MOCK=1`); ein REST-Build
  braucht eine absolute `VITE_API_URL` in `.env.native.local`.

## Konsequenzen

- Nach jedem Web-Build gilt der Entry-Check aus `docs/native.md`: Der Entry-Chunk enthält keinen Capacitor-Code.
- Natives Verhalten wird mit Vitest gegen gemockte Plugins getestet; am Gerät prüfen Kolja oder Daniel nach der
  Prüfliste in `docs/native.md`.
- Änderungen an `package.json` und `android/`/`ios/` kollidieren leicht; Phase-7-Issues laufen höchstens zu zweit
  parallel.
