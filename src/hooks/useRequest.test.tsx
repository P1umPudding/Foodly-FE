import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useRequest } from './useRequest'

it('reload() runs the request again from loading', async () => {
  const run = vi.fn<() => Promise<string>>().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
  const { result } = renderHook(() => useRequest(run, []))
  await waitFor(() => expect(result.current.status).toBe('error'))
  const reload = result.current.reload

  act(() => result.current.reload())
  expect(result.current.status).toBe('loading')
  await waitFor(() => expect(result.current.data).toBe('ok'))
  expect(run).toHaveBeenCalledTimes(2)
  expect(result.current.reload).toBe(reload)
})
