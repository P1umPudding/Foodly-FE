// Minimal WebSocket client for the (foreign) backend.
//
// Handles: connect + auto-reconnect (exponential backoff), connection-status
// subscriptions, request/response correlation (send a typed message, await its
// reply), and server-pushed events.
//
// MESSAGE ENVELOPE — this is an ASSUMPTION; align it with the real backend protocol:
//   client → server (request):  { id: string, type: string, payload?: unknown }
//   server → client (response): { id: string, ok: boolean, result?: unknown, error?: string }
//   server → client (event):    { type: string, payload?: unknown }   // no id
// If the backend uses a different shape, adapt `request()` (the send line) and
// `handleMessage()` (the parse logic) — nothing else needs to change.

export type SocketStatus = 'connecting' | 'open' | 'closed';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class SocketClient {
  private ws: WebSocket | null = null;
  private status: SocketStatus = 'closed';
  private pending = new Map<string, Pending>();
  private eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  private statusListeners = new Set<(status: SocketStatus) => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;
  private seq = 0;
  private mockResponder: ((type: string, payload?: unknown) => Promise<unknown>) | null = null;

  constructor(private readonly url: string) {}

  /**
   * Dev-only: answer requests from a local responder instead of a real socket
   * (see `src/mocks`). No WebSocket is opened; status flips straight to 'open'.
   */
  useMocks(responder: (type: string, payload?: unknown) => Promise<unknown>): void {
    this.mockResponder = responder;
    this.setStatus('open');
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  /** Subscribe to connection-status changes. Returns an unsubscribe fn. */
  onStatus(fn: (status: SocketStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  /** Subscribe to server-pushed events of a given `type`. Returns an unsubscribe fn. */
  on(type: string, fn: (payload: unknown) => void): () => void {
    let set = this.eventListeners.get(type);
    if (!set) this.eventListeners.set(type, (set = new Set()));
    set.add(fn);
    return () => {
      set!.delete(fn);
    };
  }

  connect(): void {
    if (this.mockResponder) {
      this.setStatus('open');
      return;
    }
    if (!this.url) {
      console.warn('[socket] VITE_WS_URL is not set — not connecting.');
      return;
    }
    if (this.ws && (this.status === 'open' || this.status === 'connecting')) return;

    this.closedByUser = false;
    this.setStatus('connecting');

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
    };
    ws.onmessage = (e) => this.handleMessage(e.data);
    ws.onclose = () => {
      this.ws = null;
      this.failAllPending(new Error('socket closed'));
      this.setStatus('closed');
      if (!this.closedByUser) this.scheduleReconnect();
    };
    ws.onerror = () => {
      // The close handler does the cleanup + reconnect; nothing extra here.
    };
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
  }

  /** Send a request and await the correlated response. */
  request<T = unknown>(
    type: string,
    payload?: unknown,
    opts: { timeoutMs?: number } = {},
  ): Promise<T> {
    if (this.mockResponder) {
      return this.mockResponder(type, payload) as Promise<T>;
    }
    const timeoutMs = opts.timeoutMs ?? 15000;
    return new Promise<T>((resolve, reject) => {
      if (this.status !== 'open' || !this.ws) {
        reject(new Error('socket not connected'));
        return;
      }
      const id = `${Date.now()}-${++this.seq}`;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`request "${type}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.ws.send(JSON.stringify({ id, type, payload }));
    });
  }

  private handleMessage(raw: unknown): void {
    let msg: { id?: string; ok?: boolean; result?: unknown; error?: string; type?: string; payload?: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    // Correlated response?
    if (typeof msg.id === 'string' && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      if (msg.ok === false) p.reject(new Error(msg.error || 'request failed'));
      else p.resolve(msg.result);
      return;
    }

    // Server-pushed event?
    if (typeof msg.type === 'string') {
      this.eventListeners.get(msg.type)?.forEach((fn) => fn(msg.payload));
    }
  }

  private failAllPending(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pending.clear();
  }

  private setStatus(status: SocketStatus): void {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
