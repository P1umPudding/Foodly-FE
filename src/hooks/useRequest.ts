import { useEffect, useState } from 'react';

export type RequestState<T> = {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  error: Error | null;
};

/**
 * Run a one-shot backend request and track loading/ready/error. Re-runs when
 * `deps` change. Example:
 *
 *   const { status, data } = useRequest(() => foodly.listRecipes(), []);
 */
export function useRequest<T>(run: () => Promise<T>, deps: unknown[] = []): RequestState<T> {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    let active = true;
    setState({ status: 'loading', data: null, error: null });
    run()
      .then((data) => {
        if (active) setState({ status: 'ready', data, error: null });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', data: null, error: error as Error });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
