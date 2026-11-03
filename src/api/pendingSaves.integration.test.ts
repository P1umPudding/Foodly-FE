// useAutosave's unmount chain + the registry + foodly over a fetch fake: the GET
// for a recipe goes out only after the last PUT of the chain has landed (#80).
import { act, renderHook } from '@testing-library/react'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { foodly } from './index'
import { resetPendingSaves, trackPendingSave } from './pendingSaves'
import { useAutosave } from '../editor/useAutosave'
import type { CreateRecipe } from './protocol'

// The mode is read when the modules load, so pin REST before the imports run (vi.hoisted),
// whatever the shell env or .env.local sets.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))

type Put = { name: string; resolve: () => void; reject: () => void }

let server: { name: string; puts: Put[]; log: string[] }

function json(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 503, json: async () => body } as unknown as Response
}

beforeEach(() => {
  vi.useFakeTimers()
  server = { name: 'v0', puts: [], log: [] }
  vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    const method = init?.method ?? 'GET'
    server.log.push(method)
    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body)) as CreateRecipe
      return new Promise((resolve) =>
        server.puts.push({
          name: body.name,
          resolve: () => {
            server.name = body.name
            resolve(json({ id: 5, name: body.name }))
          },
          reject: () => resolve(json({ error: { message: 'offline' } }, false)),
        }),
      )
    }
    return Promise.resolve(json({ id: 5, name: server.name, rating: [], sections: [], notes: [], images: [] }))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  resetPendingSaves()
})

afterAll(() => vi.unstubAllEnvs())

const drain = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })

function editor(onFlushError = vi.fn()) {
  return renderHook(
    ({ name }) =>
      useAutosave(name, (value) => foodly.updateRecipe(5, { name: value } as CreateRecipe), {
        onFlushError,
        onUnmountFlush: (done) => trackPendingSave(5, done),
      }),
    { initialProps: { name: 'v0' } },
  )
}

describe('reads wait for the editor unmount save', () => {
  it('a GET right after unmount goes out after the PUT and returns the new value', async () => {
    const { rerender, unmount } = editor()
    rerender({ name: 'v1' })
    unmount() // debounce still pending: the unmount fires the PUT

    const read = foodly.getRecipe(5)
    await drain()
    expect(server.log).toEqual(['PUT'])

    server.puts[0].resolve()
    await expect(read).resolves.toMatchObject({ name: 'v1' })
    expect(server.log).toEqual(['PUT', 'GET'])
  })

  it('waits for the follow-up PUT queued behind one in flight', async () => {
    const { rerender, unmount } = editor()
    rerender({ name: 'v1' })
    act(() => vi.advanceTimersByTime(800)) // PUT v1 in flight
    rerender({ name: 'v2' })
    unmount()

    const read = foodly.getRecipe(5)
    server.puts[0].resolve()
    await drain()
    expect(server.puts.map((p) => p.name)).toEqual(['v1', 'v2'])
    expect(server.log).toEqual(['PUT', 'PUT'])

    server.puts[1].resolve()
    await expect(read).resolves.toMatchObject({ name: 'v2' })
  })

  it('a failed PUT does not block the GET, and the failure is reported once', async () => {
    const onFlushError = vi.fn()
    const { rerender, unmount } = editor(onFlushError)
    rerender({ name: 'v1' })
    unmount()

    const read = foodly.getRecipe(5)
    server.puts[0].reject()

    await expect(read).resolves.toMatchObject({ name: 'v0' })
    expect(onFlushError).toHaveBeenCalledTimes(1)
  })
})
