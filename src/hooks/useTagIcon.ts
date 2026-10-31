import { useEffect, useSyncExternalStore } from 'react'
import { loadTagIcon, peekTagIcon, subscribeTagIcons } from '../api/assets'
import type { Tag } from '../api/protocol'

// Icon URL for a tag, or null while loading / without an icon / when it can't be
// shown. Goes through assets.ts rather than foodly.*: the icon is an asset whose
// REST route needs the bearer, so assets.ts loads it as a blob and caches it.
export function useTagIcon(tag: Tag): string | null {
  const { id, svg } = tag
  const src = useSyncExternalStore(subscribeTagIcons, () => peekTagIcon({ id, svg }))
  const pending = src === undefined

  useEffect(() => {
    if (pending) void loadTagIcon({ id, svg })
  }, [id, svg, pending])

  return src ?? null
}
