import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'
import { foodly } from './index'
import { jsonResponse, seedSession } from '../test/auth'

// The mode is read when the modules load, so pin REST before the imports run.
vi.hoisted(() => vi.stubEnv('VITE_MOCK', ''))
afterAll(() => vi.unstubAllEnvs())

beforeEach(() => {
  seedSession()
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const user = (id: number) => ({ id, name: `User ${id}`, profilePicture: null })
const idsOf = (url: unknown) => new URL(String(url), 'http://x').searchParams.get('ids')!.split(',').map(Number)

// A fresh Response per call: a body can only be read once.
function answerWithUsers(fail?: (ids: number[]) => boolean) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    const ids = idsOf(url)
    return Promise.resolve(
      fail?.(ids) ? jsonResponse(500, { error: 'boom' }) : jsonResponse(200, { data: ids.map(user) }),
    )
  })
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

it('splits more than 100 ids into chunks of 100 and merges the answers', async () => {
  const fetchSpy = answerWithUsers()
  const users = await foodly.getUsers(range(1, 150))
  expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
    `/api/v1/users?ids=${range(1, 100).join(',')}`,
    `/api/v1/users?ids=${range(101, 150).join(',')}`,
  ])
  expect(users.map((u) => u.id).sort((a, b) => a - b)).toEqual(range(1, 150))
})

it('sends no request for no ids', async () => {
  const fetchSpy = answerWithUsers()
  await expect(foodly.getUsers([])).resolves.toEqual([])
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('asks for each id once', async () => {
  const fetchSpy = answerWithUsers()
  await foodly.getUsers([2, 3, 2])
  expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(['/api/v1/users?ids=2,3'])
})

it('keeps the users of the chunks that succeeded', async () => {
  answerWithUsers((ids) => ids[0] === 1)
  const users = await foodly.getUsers(range(1, 150))
  expect(users.map((u) => u.id)).toEqual(range(101, 150))
})

it('fails when every chunk failed', async () => {
  answerWithUsers(() => true)
  await expect(foodly.getUsers([2])).rejects.toThrow()
})
