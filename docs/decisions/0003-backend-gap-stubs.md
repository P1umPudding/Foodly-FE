# 0003 — Stubs für fehlende Backend-Funktionen (Alpha)

Status: angenommen (Daniel, 2026-10-29)

## Kontext

Ziel ist eine **Alpha** gegen das echte Backend (`web-api`). Bis das Backend
fertig ist, gibt es keine echten Nutzer. Einige Funktionen haben noch keinen
Endpoint: Bilder anzeigen (#9), Namen von Usern (#10), Ratings (#11),
Teilen (#12), Gruppen (#13), „hinzugefügt am“ (#14), Login (#15). Die UI dafür
soll trotzdem gebaut und bedienbar sein.

Den Weg gibt es schon für einen Fall: `foodly.listUsers` geht auch im REST-Modus
an den Mock-Responder (`src/api/index.ts`).

## Entscheidung

1. **Stubs leben nur in `src/api`.** Eine `foodly.*`-Methode ohne Endpoint hat im
   REST-Modus einen Stub-Zweig, Signatur wie der spätere REST-Aufruf. Komponenten
   merken keinen Unterschied. Wenn das Backend nachzieht, ändert sich nur diese
   Methode.
2. **Stub-Daten liegen lokal im Browser**, in `localStorage` unter dem Präfix
   `foodly.stub.`, geschlüsselt nach echten Backend-IDs (Rezept-ID, User-ID).
   Die Mock-JSONs aus `src/mocks/data` passen nicht zu echten IDs und werden
   dafür nicht genutzt. Mit `VITE_MOCK=1` bleibt alles wie bisher beim Mock-Responder.
3. **Register:** `src/api/stubs.ts` exportiert `STUBBED` (Menge der Features,
   z. B. `'ratings' | 'sharing' | 'groups' | 'addedAt' | 'images'`) und
   `isStubbed(feature)`. Im Mock-Modus ist nichts „gestubbt“ (alles ist Mock).
4. **Sichtbar mit Hinweis:** Gestubbte Funktionen sind in der UI bedienbar und
   tragen einen kleinen Hinweis „Demo“ (eine gemeinsame Komponente, z. B.
   `<DemoHint feature="ratings" />`, rendert nur bei `isStubbed`). Text: „Demo:
   wird noch nicht gespeichert“ bzw. „…nur in diesem Browser gespeichert“.
5. **Bilder:** Solange #9 offen ist, zeigt der REST-Modus statt Rezeptbildern einen
   neutralen Platzhalter (`recipeImageSrc` in `src/api/assets.ts`). Upload bleibt
   echt.
6. Jeder Stub verweist im Code-Kommentar auf sein Backend-Issue.

## Konsequenzen

- Alpha-Daten aus Stubs sind pro Browser und gehen beim Wechsel aufs echte
  Backend verloren. Das ist in der Alpha akzeptiert.
- Tests: Stub-Zweige bekommen Unit-Tests in `src/api` (localStorage pro Test leeren).
- Wird ein Backend-Issue geschlossen: Stub-Zweig durch REST ersetzen, Feature aus
  `STUBBED` entfernen, `docs/backend-questions.md` nachziehen.
