# QA-Checkliste: Haupt-Journeys

Grundlage für die Broad Runs von Foodly QA (am 1. und 15. jedes Monats). Jede Journey am Desktop und bei schmaler Breite (375 px) durchgehen, im Mock-Modus (`VITE_MOCK=1`) und im REST-Modus.

## App-Shell
- Desktop: Seitenleiste mit Wortmarke (→ `/` → `/recipes`), „Neues Rezept“, „Rezepte“, Kategorien mit Punkt und Anzahl, Profil-Eintrag unten (→ `/profile`)
- Seitenleiste ein- und ausklappen (Tooltips, Zustand bleibt nach Neuladen)
- Handy: Tab-Leiste; „+“-FAB und Avatar nur auf `/recipes`; FAB verdeckt keinen Inhalt
- Unbekannte Route zeigt 404 mit „Zur Startseite“; Seitenleiste mit „Start“ und „Rezepte“, Tab-Leiste am Handy ebenso
- `/profile`: Avatar (Handy) bzw. Profil-Eintrag unten → Profil; Handy-Titel „Profil“, dort kein Avatar und kein aktiver Tab; Design Hell/Dunkel/System; „Kategorien ›“ → `/categories` → Zurück → `/profile`; „Abmelden“ (rot, nur REST) → `/login`
- Kopfzeilen-Titel je Route (Rezepte / Neues Rezept / Rezept bearbeiten / Rezept); genau ein h1 pro Seite
- Breakpoint wechseln, ohne dass die Seite neu aufgebaut wird (Entwurf und Liste bleiben erhalten)

## Start
- `/` zeigt Datum, Begrüßung, Kategorien-Kacheln mit Anzahl und „Verwalten“, „Zuletzt erstellt“; Kacheln führen auf `/categories/:id`

## Kategorien
- `/categories`: Liste mit Anzahl, „Neue Kategorie“ (Name, Farbe) anlegen, bearbeiten, löschen; Zurück
- `/categories/:id`: Kopf mit Name, Anzahl, Sichtbarkeit, Rezeptliste, Weitere Aktionen
- Im Rezept „Kategorien ändern“: Popover (Desktop) bzw. Sheet (Handy), zuordnen, neue anlegen

## Rezeptliste
- Suche (Name, Tags, Abschnitte), Leeren-✕, Hinweis zur Zutatensuche bei 0 Treffern; Zurück verhält sich sinnvoll
- Filter: Kategorie, Tags, Zutaten, Max. Dauer, Rolle, Teilen-Status; Filter-Sheet am Handy mit Zähler-Badge
- Aktive Filter als Chips entfernen; „Filter zurücksetzen“
- Sortierung (Name, Arbeitszeit, Gesamtzeit, Bewertung, auf- und absteigend), Ansicht ausführlich/kompakt, Gruppierung nach Kategorie, Gruppen ein- und ausklappen
- URL teilen, neu laden, Zurück; persönliche Voreinstellung bei leerer URL; Scrollposition nach Rückkehr vom Rezept
- Ergebnisanzahl („N Rezepte“, „N+ Rezepte“ solange Seiten ausstehen); Zustände Laden, Fehler mit Erneut-versuchen, leer und keine Treffer; Nachladen beim Scrollen, Nachladefehler mit Erneut-versuchen unter der Liste (Zahl bleibt „N+“)

## Rezeptdetail
- Portionen bzw. Faktor per Eingabe und ±, ungültige Eingabe (leer, 0, negativ); Mengen mit Dezimalkomma; Abhaken; Wachhalten
- Bewertung: Popover am Desktop, Bottom-Sheet am Handy, Entfernen, Durchschnitt bei gemeinsamen Rezepten, Demo-Hinweis (REST)
- Bilder, Lightbox (Pfeile, Escape, Thumbnails); REST-Modus ohne Fotos (Platzhalter)
- Tags als Icon oder Name; Tag-Tokens im Text
- Zeit-Chips in Schritten starten einen Timer bzw. öffnen das Panel
- Quelle als Link; Kopie erstellen (auch mehrfach hintereinander); Löschen mit Dialog (inkl. Fehlerfall); Bearbeiten nur mit Rechten; ungültige ID

## Editor
- Neu: Anlegen nur mit Titel, Verwerfen
- Bearbeiten: Autosave mit Status (Speichert / Gesichert / Fehler mit Erneut-versuchen), Warnung beim Schließen des Tabs, „Fertig“ zeigt den neuen Stand
- Grunddaten (Titel mit Tag-Vorschau, Quelle, Zeiten, Größe Portionen/Freitext), Tags, Notizen
- Zutaten: Katalog-Auswahl oder Freitext, Zusatz-Spalte (nur bei Katalog-Zutat), Reihenfolge ändern, entfernen
- Abschnitte und Schritte hinzufügen, verschieben, entfernen; Bilder hochladen, Hauptbild wählen
- Kein Zugriff für Betrachter; ungültige ID

## Timer, Theme, Bedienbarkeit
- Timer-Knopf: Popover (Desktop) bzw. Sheet (Handy); Schnellwahl und Dauer-Rad; benannte und unbenannte Timer
- Pause, Fortsetzen, Neustart, Löschen; Alarm mit Toast und Stopp; Countdown in der Kopfzeile
- Timer überleben Navigation und Neuladen (benannte)
- Theme Hell/Dunkel/System über das Segment „Design“ auf `/profile`
- Tastatur: sichtbarer Fokus auf allen Bedienelementen; Handy: Tippflächen ≥ 40 px
