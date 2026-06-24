import { SocketClient } from './socket';

// Single shared connection to the backend. The URL comes from the environment
// (.env.local → VITE_WS_URL). `main.tsx` calls `socket.connect()` on startup.
const WS_URL = import.meta.env.VITE_WS_URL ?? '';

export const socket = new SocketClient(WS_URL);
export { type SocketStatus } from './socket';

// ---------------------------------------------------------------------------
// Typed API surface — EXAMPLES. Replace the message `type` strings and the
// payload/return types to match the real backend protocol. Every call is just
// `socket.request<ReturnType>('message.type', payload)`.
// ---------------------------------------------------------------------------

// e.g. a CRUD resource (the "online part"):
export type Item = { id: string; name: string; updatedAt: string };

export const foodly = {
  listItems: () => socket.request<Item[]>('items.list'),
  getItem: (id: string) => socket.request<Item>('items.get', { id }),
  createItem: (input: { name: string }) => socket.request<Item>('items.create', input),
  updateItem: (item: Item) => socket.request<Item>('items.update', item),
  deleteItem: (id: string) => socket.request<{ ok: true }>('items.delete', { id }),

  // The "offline changes" part: send a batch, get a per-change result back.
  syncChanges: (changes: Change[]) => socket.request<SyncResult>('changes.sync', { changes }),
};

export type Change = {
  op: 'create' | 'update' | 'delete';
  entity: string;
  id: string;
  fields?: Record<string, unknown>;
  baseVersion?: number;
};

export type SyncResult = {
  applied: number;
  conflicts: Array<{ id: string; reason: string }>;
};
