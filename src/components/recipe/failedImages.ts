// Image load failures, remembered per src and shared by every recipe image: paging back in the Lightbox or
// opening it from a failed hero shows the placeholder right away instead of flashing a broken image.
// Deliberately free of other app imports, so the test setup can reset it without loading src/api early.
import { useState } from 'react'

const failedSrcs = new Set<string>()

// A short outage shouldn't leave every photo as a placeholder until a reload: once the browser is back
// online, images get another try on their next render.
if (typeof window !== 'undefined') window.addEventListener('online', () => failedSrcs.clear())

// Switching to another src shows it again without a reset effect.
export function useImageFailed(src: string | null) {
  const [, rerender] = useState(0)
  return {
    failed: src !== null && failedSrcs.has(src),
    onError: () => {
      if (src === null) return
      failedSrcs.add(src)
      rerender((n) => n + 1)
    },
  }
}

// Tests only: module state would otherwise leak between cases.
export function resetFailedImages(): void {
  failedSrcs.clear()
}
