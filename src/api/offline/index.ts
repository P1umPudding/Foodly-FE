// Device-local offline store and settings. Imported directly (no `foodly.*` branch: no backend, same in mock and
// REST mode), and only from the lazily loaded profile page so it stays out of the entry chunk.
export * from './db'
export * from './settings'
