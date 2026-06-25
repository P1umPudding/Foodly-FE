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

Details je Phase in `phases/`.

---

## Phase 0 — Datenaufbereitung  (Querschnitt) ✅ erledigt

Wie Backend-Daten strukturiert, gecacht und für die Anzeige aufbereitet werden:
DTOs unangetastet (`protocol.ts`), geteilte Entities flach als Lookup-Maps,
Resolve an der API-Grenze (View-Modelle in `views.ts`). Klein halten — nur was
die nächste Phase braucht. → `phases/phase-0-datenaufbereitung.md`

Erste Scheibe umgesetzt (`views.ts`: `averageRating`, `formatIngredient`).
Lookup-Maps / Cache kommen erst, wenn eine spätere Phase sie braucht.

## Phase 1 — Rezepte ansehen  ✅ erledigt

Das Herzstück: Rezepte durchstöbern und ein Rezept im Detail lesen. Reines
Lesen, passt 1:1 zu den Mock-Daten. **Auf `main` gemergt (PR #2).**

- **Rezeptliste** (`/`) — kompakte Zeilen (Name, Zeit, Rating, Tags).
- **Rezept-Detail** (`/recipes/:id`) — Kopf + Meta-Zeile, Notizen, je Section
  ein 2-Spalten-Block (Zutaten links, Schritte rechts), screen-first.

**Vollständig umgesetzt:** Liste + Detail, `CatalogProvider`, `<TagText>`,
Rating (kompakt + Detail-Popover nach Rolle), alle Lade-/Fehler-/Leer-Zustände.
**Über die Spec hinaus** schon gebaut (§13 hatte sie als „später"/backend-
abhängig eingeplant): **Tag-Icons** (`<TagIcon>`, SVG-Rendering) und **Rezept-
Bilder** (`mainImage` + Galerie als Kachel-Layout mit Lightbox) — via Dev-Asset-
Resolver (`src/api/assets.ts`); das echte Backend-`hash`→URL-Schema bleibt offen.

→ Volle Spezifikation: `phases/phase-1-rezepte-ansehen.md`

## Phase 2 — Organisation & Navigation  ⬅️ JETZT

Struktur um die Liste herum, sobald es mehr als eine Handvoll Rezepte gibt.

- Kategorien (`userCategory`) als Sidebar/Filter, inkl. Farben.
- Filtern nach Tags, Volltext-Suche über Namen/Zutaten.
- Sortierung (Name, Zeit, Rating).

> **Dashboard / Startseite** ist aus Phase 2 herausgelöst → jetzt **Phase 5**
> (backend-blockiert auf Timestamps, liegt bei den anderen backend-abhängigen
> Phasen).

**Listen-Modi (Filter nach Rolle des aktuellen Users)** — die frühere flache,
überlappende 5-Modi-Liste ist ersetzt durch ein **Zwei-Achsen-Modell** (Achse 1
„meine Rolle" owner/editor/viewer × Achse 2 „Collaboration" Private/Shared/
Collaborative). 6 von 9 Kombinationen gültig, ableitbar aus `owner`/`viewers`/
`editors`. Voll ausgearbeitet im Spec.

**Listen-Ansichten (umschaltbar)** (Idee, Detail nach Phase 1):
- **detailed** (mit Hauptbild + mehr Meta) ↔ **compact** (kein Bild, weniger
  Details) — das Bild hilft, ein Rezept visuell wiederzuerkennen/auszuwählen.
- **by category** (Kategorien einzeln ein-/ausklappbar) ↔ **flat list**.

→ Spec (in Arbeit, noch nicht implementierungsreif):
`phases/phase-2-organisation-navigation.md`

## Phase 3 — Koch-Modus

Die Detailansicht für das tatsächliche Kochen optimieren.

- Schritt-für-Schritt-Ansicht (ein Schritt groß, durchblättern).
- Portionen umrechnen (`basePortionMultiplier` → Mengen skalieren).
- „Bildschirm anlassen" (`useWakeLock` ist schon da) hier sinnvoll einbinden.
- Zutaten abhaken (lokaler State, kein Persist nötig).
- **Timer:** beim Kochen Timer stellen können (lokal, kein Persist nötig).
  - Custom-Timer: Dauer frei eingeben/starten, mehrere parallel, Hinweis bei
    Ablauf (Sound/Vibration + visuell; Wake-Lock greift hier ohnehin).
  - *Idee (optional):* Rezepte bringen voreingestellte Timer mit — z. B. aus
    `time`/Schritt-Daten abgeleitet, sodass ein Schritt seinen Timer direkt per
    Tap startet. Erst klären, ob/wie diese Zeiten in den Daten stecken.

## Phase 4 — Rezepte bearbeiten  (braucht Backend)

Anlegen/Editieren von Rezepten. **Blockiert auf Persistenz** — ohne Backend nur
als UI-Prototyp mit lokalem State sinnvoll.

- Formular für Rezept (Sections, Zutaten, Schritte).
- Rezept duplizieren (Kopie, bei der man selbst owner wird).
- Rating abgeben, Notizen bearbeiten.
- **Tag-/Emoji-Picker** (jederzeit öffenbar; bei `recipe.tags` am präsentesten,
  aber auch in `time`, `steps` etc. verfügbar): zeigt **alle** Tags (erst die mit
  Bild, dann die ohne), durchsuchbar. Auswahl fügt `{tagId}` an der Cursorstelle
  ein. **Toggle „Name statt Icon"** fügt stattdessen `{!tagId}` ein — der Toggle
  setzt sich beim Schließen/Neuöffnen wieder auf „Icon" zurück.

→ Erst sinnvoll, wenn der Login-/Backend-Workflow steht.

## Phase 5 — Dashboard / Startseite  (braucht Backend)

Überblicks-Startseite mit Kacheln. Aus Phase 2 herausgelöst, weil **blockiert
auf Timestamps** (`createdAt` + „wann wurde ich hinzugefügt") — fehlen aktuell im
Protokoll (siehe Offene Punkte / Types). Liegt hier bei den anderen
backend-abhängigen Phasen.

- Rezepte, zu denen man **kürzlich hinzugefügt** wurde (als viewer/editor),
- **eigene kürzlich erstellte** Rezepte,
- persönliche **Kategorien** (`userCategory`) mit Links,
- **Gruppen**, in denen man Mitglied ist, mit Links,
- ggf. weitere Kacheln.

## Phase 6 — Mobile optimieren

Die Web-App für Mobile schärfen: Touch-Targets, responsives Layout, Performance,
ggf. PWA-Grundlagen. Voraussetzung fürs native Wrappen.

## Phase 7 — Als native Mobile-App wrappen

Die SPA als native App verpacken (z.B. Capacitor) für iOS/Android: App-Store-
Präsenz, native Shell, Zugriff auf Geräte-APIs.

## Phase 8 — Offline-Modus (native App)

- Daten **cachen**, solange online; offline bereitstellen (vermutlich lokale
  **SQLite**-DB).
- Edits offline **lokal ausführen + queuen**, gegen das Backend syncen, sobald
  wieder online.
- **Konflikte:** Edits, die wegen Konflikten nicht angewandt werden konnten,
  dem Nutzer als Fehlermeldung anzeigen.

**Offline-Settings (lokal gespeichert), detailliert konfigurierbar:**
- Offline-Modus überhaupt **an/aus**.
- **Downward-Sync** (Daten laden): nur WLAN ↔ auch mobile Daten.
- **Upward-Sync** (Edits hochladen): nur WLAN ↔ auch mobile Daten.
- **Bilder** lokal speichern: ja/nein (und falls ja: ggf. nur über WLAN, da
  Bilder die schweren Payloads sind).

Weitere Kandidaten (zu entscheiden):
- **Scope:** welche Rezepte offline halten — alle vs. nur Favoriten/„angepinnte"
  vs. zuletzt geöffnete (alles-cachen skaliert auf Mobile schlecht).
- **Speicher-Limit + Eviction:** Cache-Obergrenze + was zuerst rausfliegt; dazu
  belegten Speicher anzeigen und „lokalen Cache leeren".
- **Sync-Trigger/-Frequenz:** auto bei App-Start / periodisch / nur manuell /
  bei Reconnect; ggf. nur im Vordergrund (Akku).
- **Konflikt-Verhalten:** wie Konflikte gemeldet/aufgelöst werden (das Backend
  verwirft kollidierende Changes — siehe Backend-README).

**Types-Implikation (kein Blocker, nur Vorausschau):** machbar — Standard-
Offline-Pattern — aber offline **neu erstellte** Entities haben noch keine
server-`id` (die ist `number`, server-vergeben). Man braucht also eine
**temporäre Client-id** (z.B. UUID/negative Zahl), um sie lokal zu referenzieren
(welche Section gehört zu welchem Rezept?) und in der Edit-Queue anzusprechen.
Beim Sync vergibt der Server die echte id → die Temp-id muss überall
**nachgezogen (remapped)** werden. Dazu Sync-Metadaten (dirty-Flags, Queue,
Basis-Version für Konflikt-Erkennung). Also nicht „unmöglich", nur Extra-
Modellierung — Details klären wir, wenn die Phase dran ist.

## Phase 9 — Weitere Daten & Funktionen

Laufende Erweiterung von Modell und Funktionsumfang, z.B.:
- **Persönliche Notizen** an Rezepten (privat pro User).
- **Öffentliche Kommentare** an Rezepten.
- *Idee:* **Abkürzungsverzeichnis** (z. B. EL = Esslöffel) und **Mengen-
  verzeichnis** (z. B. 1 EL Zucker = x g) — zum Nachschlagen und ggf. zum
  Umrechnen von Mengen.
  - *Weitergedacht:* Abkürzungen automatisch aus den eigenen Rezepten
    erkennen, sodass jeder im Verzeichnis nur die Abkürzungen sieht, die in
    seinen Rezepten tatsächlich vorkommen.
- (weiteres nach Bedarf)

---

## Vorschläge für zukünftige Features (unsortiert)

Lose Ideen, noch keiner Phase fest zugeordnet — hier gesammelt, bis sie
ausgearbeitet und einsortiert sind.

### Rezept-Import von externen Plattformen

Rezepte von großen Rezept-Plattformen (z. B. **Chefkoch**, **EatSmarter**)
importieren. **Schreib-Feature → backend-/persistenz-blockiert** (nahe Phase 4:
ein Import erzeugt einen Rezept-Entwurf, den man im Editier-Formular nachbessert).

- **Wie genau ist offen.** Öffentliche APIs gibt es i. d. R. nicht → realistischer
  Weg ist, die strukturierten Daten zu parsen, die solche Seiten einbetten
  (`schema.org/Recipe` als JSON-LD), per Rezept-URL.
- **Rechtliches/ToS** der Plattformen vorab klären.

### Rezepte abfotografieren (analog → digital)

Ausgedruckte oder handschriftliche/analoge Rezepte **abfotografieren**, die nötigen
Infos automatisch extrahieren (OCR / Vision-Modell) und als digitales Rezept
speichern — mit der Option, die erkannten Felder vor dem Speichern zu
**ändern/korrigieren**.

- Verwandt mit dem Plattform-Import oben: beides ist „Rezept aus externer Quelle",
  nur anderer Eingang (URL vs. Kamera/Foto). Gleicher Endpunkt: ein Entwurf, der
  ins Editier-Formular (Phase 4) fließt.
- **Schreib-Feature → backend-blockiert**; zusätzlich offen, wo die
  OCR/Extraktion läuft (Client vs. Backend/Service).

### Nährwerte / Inhaltsstoffe anzeigen

Indikator bzw. Tabelle über Inhaltsstoffe je Rezept — Fett, Kohlenhydrate,
Zucker, ggf. Kalorien/Protein usw.

- **Daten-Haken existiert schon:** Der `Ingredient`-Katalog ist mit künftigen
  Metadaten inkl. **Nährwerte** vorgesehen (siehe
  `phases/phase-0-datenaufbereitung.md` und `protocol.ts`). Noch offen: die Werte
  selbst im Modell, und die **Aggregation pro Rezept** (Summe über Zutaten ×
  Menge — braucht verlässliche Mengen/Einheiten, vgl. Mengenverzeichnis oben).

---

## Offene Punkte (später)

- Login-/Auth-Workflow (Voraussetzung für Phase 4 und echtes Multi-User).
- Bilder: `image.hash` → echte Image-URL (Backend-abhängig).
- Tag-SVGs (`tag.svg` Hash) rendern.

### Daten-/Protokoll-Fragen (mit Backend klären)

- **Timestamps fehlen** (`createdAt`, „added-at" pro viewer/editor) — blockiert
  das Dashboard (Phase 5: „kürzlich erstellt / hinzugefügt").
- **`Recipe.updatedAt`** (zusätzlich zu `createdAt`): soll nur Änderungen am
  *eigentlichen Rezept* (Inhalt) abbilden — **nicht** Änderungen an
  viewers/editors/Sharing.
- **`userCategory` Icon:** Kategorien könnten ein Icon bekommen (`icon?`, darf
  fehlen / `undefined`).
- **Notification-/Activity-Feed nötig**, um zu erfahren, wenn man irgendwo
  hinzugefügt wurde (liefert auch das „added-at" oben). DB-Modellierung noch
  offen — gemeinsam besprechen.
- **Gruppen ↔ Rezepte (zeitnah überdenken):** Rezepte werden *nicht* direkt an
  eine Gruppe geteilt; Idee war, beim Teilen alle Gruppenmitglieder
  vorauszuwählen. Aber: fügt man später jemanden zur Gruppe hinzu, ist er
  *nicht* automatisch in den vorher geteilten Rezepten → Modell nochmal
  durchdenken.
- **`tagId = name`:** Tag-Identität *ist* der Anzeigename → Umbenennen bräche
  alle Referenzen (war nicht eingeplant). Falls Tags je editierbar werden,
  stabile id getrennt vom Label nötig.
- **`UserRating` ist DB-only:** wird im Frontend nie direkt geholt (nur
  `recipe.rating` kommt mit). Gehört damit nicht in den Wire-Vertrag
  (`protocol.ts`) → entfernen bzw. als backend-only behandeln.
