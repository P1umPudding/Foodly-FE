import { beforeEach, describe, expect, it } from 'vitest'
import { mockRequest, CURRENT_USER_ID } from './index'
import type { RecipeComment } from '../api/comments'

beforeEach(() => localStorage.clear())

const list = async (id: number) => (await mockRequest('comments.list', { id })) as RecipeComment[]

describe('mock comments', () => {
  it('seeds sample comments once; deleting them all stays empty after a reload', async () => {
    const seeded = await list(1)
    expect(seeded.length).toBeGreaterThan(0)
    // Recipe 1 is mine (user 1), so I may delete the others' comments.
    for (const c of seeded) await mockRequest('comments.delete', { id: 1, commentId: c.id })
    expect(await list(1)).toEqual([])
  })

  it('adds my comment at the end and refuses deleting a foreign one on a recipe I only view', async () => {
    const before = await list(3)
    const added = (await mockRequest('comments.add', { id: 3, text: 'Neu' })) as RecipeComment
    expect(added.user).toBe(CURRENT_USER_ID)
    expect((await list(3)).at(-1)?.text).toBe('Neu')

    const foreign = before.find((c) => c.user !== CURRENT_USER_ID)!
    await expect(mockRequest('comments.delete', { id: 3, commentId: foreign.id })).rejects.toThrow('Nicht erlaubt')
    await mockRequest('comments.delete', { id: 3, commentId: added.id })
    expect(await list(3)).toHaveLength(before.length)
  })
})
