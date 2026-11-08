# 0004 — Keine GitHub Actions

Status: angenommen (Kolja, 2026-11-05)

## Kontext

Am 27.10. kam mit Issue #14 / PR #18 ein GitHub-Actions-Workflow
(`.github/workflows/ci.yml`) ins Repo. Kolja will für dieses Projekt keine
GitHub Actions.

## Entscheidung

- `.github/workflows/` wird entfernt. Im Repo gibt es keine GitHub-hosted CI.
- Kein Agent legt wieder Workflows an, auch nicht auf Feature-Branches.
  Issues und Specs fordern keine CI an. Die Regel steht in `CLAUDE.md`.
- Die Checks laufen lokal: `npm ci`, `npm run build`,
  `npm test -- --passWithNoTests`, `npm run format:check`. Der Worker nennt
  das Ergebnis in der PR-Beschreibung. Der Dispatcher prüft vor der
  Merge-Anfrage die PR-Beschreibung, nicht `statusCheckRollup`.

### Nachtrag 2026-11-08: Lint als fünfter Check

Entschieden vom Lead auf Vorschlag des Maintainers (PR „ESLint lokal“): ESLint
läuft lokal als `npm run lint` und ist ab dem Merge der fünfte Pflicht-Check
(Exit 0). Die Reihe lautet damit `npm ci`, `npm run build`,
`npm test -- --passWithNoTests`, `npm run format:check`, `npm run lint`. Auch
dafür gibt es keine GitHub-hosted CI. Altlasten stehen gezählt in
`eslint-suppressions.json` und werden über Issues pro Regel abgebaut.

## Konsequenzen

- Kein automatischer Check auf GitHub. Ob die Checks grün sind, hängt an der
  Angabe des Workers im PR.
- Will man wieder CI, braucht es eine neue Entscheidung von Kolja.
