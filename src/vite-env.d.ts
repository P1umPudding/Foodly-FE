/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket endpoint of the backend (e.g. wss://api.example/ws). */
  readonly VITE_WS_URL: string
  /** REST backend base URL; when set, the Skaile preview doesn't force mock mode. */
  readonly VITE_API_URL?: string
  /** `'1'` answers every request from the in-browser mocks. */
  readonly VITE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
