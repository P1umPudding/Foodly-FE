// Loads the app-wide lookup catalogs (tags, users, current user) once at
// startup. Tag *images* are never bulk-loaded — Tag.svg is only a hash; the
// image would be fetched lazily per tag when actually rendered.
import { createContext, useContext, type ReactNode } from 'react';
import { Loader } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import type { Tag, TagId, User, UserId } from '../api/protocol';

export type CatalogStatus = 'ready' | 'error';

type Catalog = {
  tags: { byId: Record<TagId, Tag>; status: CatalogStatus };
  users: { byId: Record<UserId, User>; status: CatalogStatus };
  currentUserId: UserId | null;
};

const CatalogContext = createContext<Catalog | null>(null);

function indexBy<T, K extends string | number>(rows: T[] | null, key: (t: T) => K): Record<K, T> {
  const out = {} as Record<K, T>;
  for (const row of rows ?? []) out[key(row)] = row;
  return out;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const tagsReq = useRequest(() => foodly.listTags(), []);
  const usersReq = useRequest(() => foodly.listUsers(), []);
  const meReq = useRequest(() => foodly.me(), []);

  // Graceful degrade: render children once every load has *settled* (ready or
  // error). A failed catalog just yields an empty map + 'error' status; the UI
  // degrades (tokens stay literal, user names fall back) rather than crashing.
  const settled = [tagsReq, usersReq, meReq].every((r) => r.status !== 'loading');
  if (!settled) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  const value: Catalog = {
    tags: { byId: indexBy(tagsReq.data, (t) => t.id), status: tagsReq.status === 'error' ? 'error' : 'ready' },
    users: { byId: indexBy(usersReq.data, (u) => u.id), status: usersReq.status === 'error' ? 'error' : 'ready' },
    currentUserId: meReq.data?.id ?? null,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

function useCatalog(): Catalog {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within <CatalogProvider>');
  return ctx;
}

export function useTags() { return useCatalog().tags; }
export function useUsers() { return useCatalog().users; }
export function useTag(id: TagId): Tag | undefined { return useCatalog().tags.byId[id]; }
export function useUser(id: UserId): User | undefined { return useCatalog().users.byId[id]; }
export function useCurrentUserId(): UserId | null { return useCatalog().currentUserId; }
