# #144 Rezeptbilder anzeigen

> Aus `docs/superpowers/plans/2026-11-08-auth-login.md` (A4), Foodly Lead, Produktentscheidungen Daniel 08.11. (Registrierung offen, Tokens in localStorage). Spec: `docs/superpowers/specs/2026-11-08-auth-login-design.md`.

**Entblockt:** klassenserver7b/Foodly-backend#20 ist seit 09.11.2026 auf `main` (097b69d). Vertrag gegen `main` erneut geprüft (Lead, 09.11.): unverändert gegenüber der Spec.
**Depends on:** #140


Labels: alpha · Depends on: ImageRef-Issue

### Context
B1 ist mit Backend-PR #19 gelöst (`mainImage`/`images` als `{ id, hash, name }`). Mit PR #20 wird
`GET /images/{hash}` öffentlich, damit funktioniert `<img src>` ohne Bearer. Heute ist `images` im
REST-Modus gestubbt (`src/api/stubs.ts`, `src/api/assets.ts`, ADR 0003): Liste und Detail zeigen
kein Foto, der Editor einen Platzhalter.

### Goal
Im REST-Modus zeigen Liste (Detailliert, Kacheln), Detail (Hero + Galerie) und Editor
(`ImageManager`) die echten Bilder.

### Scope
- `recipeImageSrc(ref)` liefert im REST-Modus `apiUrl('/images/' + ref.hash)`; `images` aus der
  Stub-Liste nehmen; Demo-Hinweise zu Bildern entfernen.
- `userImageSrc(hash)` liefert im REST-Modus ebenfalls `apiUrl('/images/' + hash)` (Profilbilder echter Nutzer, z. B. Avatar im Rating); Mock-Modus unverändert.
- `alt` aus `ref.name`, sonst wie heute. Ladefehler (`onError`) zeigt den bestehenden Platzhalter.
- `docs/backend-questions.md` und `docs/plan.md` (Stub-Tabelle) nachziehen.

### Acceptance criteria
- [ ] REST-Modus: Ein Rezept mit `mainImage.hash = "ab…"` rendert `<img src="/api/v1/images/ab…">`
      in Zeile, Kachel und Detail (Test).
- [ ] Nach Upload im Editor erscheint das hochgeladene Bild sofort (Test).
- [ ] Ein Bild mit Ladefehler zeigt den Platzhalter statt eines kaputten Bilds (Test).
- [ ] `isStubbed('images')` ist im REST-Modus `false`; kein „Demo“-Hinweis mehr an Bildern.
- [ ] REST-Modus: `userImageSrc('cd…')` ergibt `/api/v1/images/cd…` (Test).
- [ ] Mock-Modus unverändert.
- [ ] Pflicht-Checks laut CLAUDE.md passen.



## Comments



## Assumptions (worker)

1. **Fehler-Platzhalter pro Stelle** („bestehender Platzhalter“): Zeile und Kachel zeigen bei Ladefehler genau ihre heutige „kein Foto“-Darstellung (Zeile: `UtensilsCrossed`-Icon, Kachel: Name-Typo). Hero, Galerie-Kacheln, Lightbox (Haupt + Thumbnails) und Editor zeigen eine gedämpfte Fläche mit Icon in fester Größe (Theme-Tokens `bg-muted`/`text-muted-foreground`, hell/dunkel). Avatar behält seinen `AvatarFallback`. Umsetzung über einen gemeinsamen Helfer/Component mit `onError`-State.
2. **alt-Texte**: Dekorative `alt=""` in Links/Buttons (Zeile, Kachel, Galerie-Thumbs, Editor-Galerie) bleiben, um Doppel-Ansagen zu vermeiden. `imageName(ref)` liefert in beiden Modi `ref.name ?? "Bild <id>"` (REST-Sonderzweig fällt weg) und wird überall genutzt, wo heute ein nicht-leerer alt/Caption steht (Lightbox; Hero als `ref.name ?? recipe.name`).
3. **„Mock-Modus unverändert“** heißt: URLs und Captions unverändert. Der `onError`-Platzhalter greift in beiden Modi (heute kaputte Mock-Uploads mit id ≥ 10000 zeigen dann den Platzhalter statt eines kaputten Bilds).
4. **Upload-Vertrag**: `POST /images` liefert `{ id, hash, name }` (Backend #19, so in #140 übernommen). Kein Dateiname im Upload nachrüsten (out of scope); `name` darf `null` sein.
5. Hash wird mit `encodeURIComponent` in die URL gesetzt (identisch für Hex-Hashes).
6. `showsRecipeImages()` wird entfernt, wenn es immer `true` wäre; Aufrufer vereinfachen. Betroffene REST-Tests (assets, RecipeRow, RecipeDetail.images, ImageManager) werden umgeschrieben.
7. Es gibt keinen gerenderten „Demo“-Hinweis an Bildern; die Doku-Anpassung umfasst zusätzlich ADR 0003 (§5 und Stub-Liste) und die Kommentare in `src/api/assets.ts`.
8. Kein Lade-Skeleton nötig; bestehende `bg-muted`-Flächen decken Laden in beiden Themes ab.
9. „Bild erscheint sofort nach Upload“ wird mit einem kleinen zustandsbehafteten Wrapper um `ImageManager` getestet (`img[src="/api/v1/images/<hash>"]`).

## Spec review

- 2026-11-10: Unabhängiger Reviewer-Subagent (frische Instanz) gegen Code geprüft. Ergebnis: keine Blocker; 3 Major (Platzhalter pro Stelle undefiniert, alt-Quelle vs. dekorative alt, Mock-Modus vs. onError) und 6 Minor (kein Demo-Hinweis vorhanden, Test-Umbau, Upload-Test braucht Wrapper, URL-Encoding, Avatar nur per Unit-Test sichtbar, Lade-/Dark-State). Alle mit konservativen Annahmen oben geschlossen; keine Backend-Änderung nötig. Entscheidung: (a) weiter ohne Rückfrage.
