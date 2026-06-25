/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket endpoint of the backend (e.g. wss://api.example/ws). */
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
