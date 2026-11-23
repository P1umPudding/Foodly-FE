# QA-Journeys

Smoke-Tests je Block, sobald dessen Issues gemergt sind. Befunde werden Issues.

## Phase 7 — Native App (Gerätetest durch Kolja/Daniel nach N7)

Plan: `docs/superpowers/plans/2026-11-23-phase-7-native-app.md`, Build-Anleitung und Prüfliste: `docs/native.md`.
Befunde sammelt das Issue „Gerätetest Phase 7: Befunde“.

1. Android und iOS: App installieren, Icon und Splash (hell/dunkel), Startseite mit Mock-Daten, Safe Areas oben/unten,
   Statusleiste in beiden Themes lesbar.
2. Navigation: Rezeptliste → Detail → Koch-Modus → Zurück-Taste (Android) schließt erst ein offenes Sheet, dann zurück,
   auf der Startseite schließt sie die App.
3. Koch-Modus: „Bildschirm wach“ an → Bildschirm geht nicht aus; Quelle-Link öffnet im In-App-Browser, Zurück führt ins
   Rezept.
4. Timer 1 Min. starten (Berechtigung erlauben), App in den Hintergrund, Bildschirm sperren → Benachrichtigung mit Ton;
   Tippen öffnet das Timer-Panel; im Vordergrund klingelt nur der In-App-Alarm.
5. Berechtigung ablehnen → Hinweis im Panel; Android 14+: Hinweis „verspäten“, Knopf öffnet die Einstellung.
6. Sobald ein Backend erreichbar ist (REST-Build): anmelden, App beenden, neu starten → weiter angemeldet.
