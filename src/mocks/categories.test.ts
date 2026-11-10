import { expect, it } from 'vitest'
import { mockData, mockRequest } from './index'
import type { Recipe, UserCategory } from '../api/protocol'

it('lists categories as a snapshot that later writes do not change', async () => {
  const category = mockData.categories.find((c) => c.recipes.length > 0)
  if (!category) throw new Error('fixture needs a category with recipes')
  const original = category.recipes[0]

  const before = (await mockRequest('categories.list')) as UserCategory[]
  const copy = (await mockRequest('recipes.copy', { id: original })) as Recipe
  const snapshot = before.find((c) => c.id === category.id)
  expect(snapshot?.recipes).not.toContain(copy.id)

  const after = (await mockRequest('categories.list')) as UserCategory[]
  expect(after.find((c) => c.id === category.id)?.recipes).toContain(copy.id)

  await mockRequest('recipes.delete', { id: copy.id })
  expect(after.find((c) => c.id === category.id)?.recipes).toContain(copy.id)
  const final = (await mockRequest('categories.list')) as UserCategory[]
  expect(final.find((c) => c.id === category.id)?.recipes).not.toContain(copy.id)
})
