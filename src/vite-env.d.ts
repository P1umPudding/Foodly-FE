/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** REST base URL (default `/api/v1`). */
  readonly VITE_API_URL?: string
  /** `'1'` answers every request from the in-browser mocks; any other value uses REST. */
  readonly VITE_MOCK?: string
  /** WebSocket endpoint, reserved for future live editing; not connected yet. */
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
