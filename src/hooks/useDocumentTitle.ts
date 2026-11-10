import { useEffect } from 'react'

// The previous title is read inside the effect, so StrictMode's mount-unmount-mount restores the right one.
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
