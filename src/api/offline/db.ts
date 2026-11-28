// The device-local offline store (Phase 8): one IndexedDB database for native app and PWA alike, no plugin. O1 only
// lays the ground (put/get, size, clear); filling it and enforcing the limit come with the sync (#355 ff.).
// No cached connection: every call opens and closes its own, so `clear` and tests never wait on a stale handle.
export const OFFLINE_DB = 'foodly-offline'
export const OFFLINE_STORES = ['recipes', 'images', 'meta'] as const
export type OfflineStoreName = (typeof OFFLINE_STORES)[number]

export function isOfflineStoreAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'))
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB-Fehler'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB abgebrochen'))
  })
}

function openOfflineDb(): Promise<IDBDatabase> {
  if (!isOfflineStoreAvailable()) return Promise.reject(new Error('Offline-Speicher nicht verfügbar'))
  const req = indexedDB.open(OFFLINE_DB, 1)
  req.onupgradeneeded = () => {
    for (const name of OFFLINE_STORES)
      if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name)
  }
  return request(req)
}

async function withDb<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openOfflineDb()
  try {
    return await run(db)
  } finally {
    db.close()
  }
}

export function offlinePut(store: OfflineStoreName, key: string, value: unknown): Promise<void> {
  return withDb((db) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    return done(tx)
  })
}

export function offlineGet<T = unknown>(store: OfflineStoreName, key: string): Promise<T | undefined> {
  return withDb((db) => request(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>)
}

// Foodly's own entries only (not navigator.storage.estimate, which counts the whole origin and is vague in
// WKWebView). Blobs by size, everything else by its JSON length: an estimate, good enough for the limit.
export function sizeOf(value: unknown): number {
  if (value instanceof Blob) return value.size
  if (value instanceof ArrayBuffer) return value.byteLength
  try {
    return new Blob([JSON.stringify(value) ?? '']).size
  } catch {
    return 0
  }
}

export function offlineUsageBytes(): Promise<number> {
  return withDb(async (db) => {
    const tx = db.transaction([...OFFLINE_STORES])
    const sizes = await Promise.all(
      OFFLINE_STORES.map((name) =>
        request(tx.objectStore(name).getAll()).then((all) => all.reduce((n, v) => n + sizeOf(v), 0)),
      ),
    )
    return sizes.reduce((a, b) => a + b, 0)
  })
}

// Empties every store; the settings live in localStorage and stay.
export function clearOfflineStore(): Promise<void> {
  return withDb((db) => {
    const tx = db.transaction([...OFFLINE_STORES], 'readwrite')
    for (const name of OFFLINE_STORES) tx.objectStore(name).clear()
    return done(tx)
  })
}
