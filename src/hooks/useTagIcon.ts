import { useEffect, useState } from 'react'
import { loadTagIcon, peekTagIcon } from '../api/assets'
import type { Tag } from '../api/protocol'

// Icon URL for a tag, or null while loading / without an icon / after a failed
// load. Goes through assets.ts rather than foodly.*: the icon is an asset whose
// REST route needs the bearer, so assets.ts loads it as a blob and caches it.
export function useTagIcon(tag: Tag): string | null {
  const [, settled] = useState(0)
  const { id, svg } = tag

  useEffect(() => {
    const current: Tag = { id, svg }
    if (peekTagIcon(current) !== undefined) return
    let active = true
    loadTagIcon(current).then(() => {
      if (active) settled((n) => n + 1)
    })
    return () => {
      active = false
    }
  }, [id, svg])

  // Read from the cache on every render, so a changed tag never shows the old icon.
  return peekTagIcon(tag) ?? null
}
