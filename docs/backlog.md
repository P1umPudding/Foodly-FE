# Backlog / Feature notes

Loose feature ideas not yet (fully) implemented.

## Keep screen on (wake lock)

A user-facing **toggle** to keep the screen awake — mainly for mobile, while
cooking from an open recipe.

- Core: `src/hooks/useWakeLock.ts` wraps the Screen Wake Lock API
  (`{ enabled, supported, setEnabled, toggle }`, re-acquires on tab refocus).
- Toggle: `src/components/WakeLockToggle.tsx`, wired into the header (`Nav`).
  **Provisional placement** — the mug icon in the top bar is a stopgap. Move it
  to a proper settings page once one exists, or onto the recipe-detail view
  where keep-awake is most useful. The component already hides itself when
  `supported === false`.
