import { useCallback, useEffect, useState } from 'react'

export type RequestState<T> = {
  status: 'loading' | 'ready' | 'error'
  data: T | null
  error: Error | null
}

/**
 * Run a one-shot backend request and track loading/ready/error. Re-runs when
 * `deps` change or `reload()` is called (both start over from 'loading'). Example:
 *
 *   const { status, data, reload } = useRequest(() => foodly.listRecipes(), []);
 */
export function useRequest<T>(run: () => Promise<T>, deps: unknown[] = []): RequestState<T> & { reload: () => void } {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading', data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  useEffect(
    () => {
      let active = true
      setState({ status: 'loading', data: null, error: null })
      run()
        .then((data) => {
          if (active) setState({ status: 'ready', data, error: null })
        })
        .catch((error: unknown) => {
          if (active) setState({ status: 'error', data: null, error: error as Error })
        })
      return () => {
        active = false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, nonce],
  )
  return { ...state, reload }
}
