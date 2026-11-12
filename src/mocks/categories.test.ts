import { describe, expect, it } from 'vitest'
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

// mockData is shared across this file: each test creates its own rows and removes them again.
const input = { name: 'Suppen', color: '#16a34a', colorLight: null, colorDark: null }
const list = async () => (await mockRequest('categories.list')) as UserCategory[]
const create = async (name = 'Suppen') =>
  (await mockRequest('categories.create', { input: { ...input, name } })) as UserCategory

describe('category writes', () => {
  it('appends a new category at the end', async () => {
    const before = await list()
    const created = await create()

    expect(created).toMatchObject({ ...input, user: 1, recipes: [] })
    expect(created.order).toBe(Math.max(...before.map((c) => c.order ?? 0)) + 1)
    const after = await list()
    expect(after[after.length - 1]).toEqual(created)
    await mockRequest('categories.delete', { id: created.id })
  })

  it('updates name and colour and keeps recipes and order', async () => {
    const created = await create()
    const recipeId = mockData.recipes[0].id
    await mockRequest('categories.setRecipes', { id: created.id, recipeIds: [recipeId] })

    const updated = (await mockRequest('categories.update', {
      id: created.id,
      input: { name: 'Eintöpfe', color: '#7c3aed', colorLight: '#ede9fe', colorDark: '#4c1d95' },
    })) as UserCategory

    expect(updated).toEqual({
      ...created,
      name: 'Eintöpfe',
      color: '#7c3aed',
      colorLight: '#ede9fe',
      colorDark: '#4c1d95',
      recipes: [recipeId],
    })
    await mockRequest('categories.delete', { id: created.id })
  })

  it('deletes a category and keeps its recipes', async () => {
    const created = await create()
    const recipeId = mockData.recipes[0].id
    await mockRequest('categories.setRecipes', { id: created.id, recipeIds: [recipeId] })

    await expect(mockRequest('categories.delete', { id: created.id })).resolves.toBeUndefined()

    expect((await list()).map((c) => c.id)).not.toContain(created.id)
    expect(mockData.recipes.some((r) => r.id === recipeId)).toBe(true)
  })

  it('replaces the recipe list', async () => {
    const created = await create()
    const [a, b, c] = mockData.recipes.map((r) => r.id)
    await mockRequest('categories.setRecipes', { id: created.id, recipeIds: [a, b] })

    const updated = (await mockRequest('categories.setRecipes', { id: created.id, recipeIds: [c, a] })) as UserCategory

    expect(updated.recipes).toEqual([c, a])
    expect((await list()).find((x) => x.id === created.id)?.recipes).toEqual([c, a])
    await expect(mockRequest('categories.setRecipes', { id: created.id, recipeIds: [-1] })).rejects.toThrow(
      'recipe -1 not found',
    )
    await mockRequest('categories.delete', { id: created.id })
  })

  it('sets order to the index in the list', async () => {
    const original = (await list()).map((c) => ({ id: c.id, order: c.order }))
    const ids = original.map((c) => c.id).reverse()

    await expect(mockRequest('categories.reorder', { categoryIds: ids })).resolves.toBeUndefined()

    const orders = new Map((await list()).map((c) => [c.id, c.order]))
    ids.forEach((id, index) => expect(orders.get(id)).toBe(index))
    for (const { id, order } of original) {
      const category = mockData.categories.find((c) => c.id === id)
      if (category) category.order = order
    }
  })

  it('rejects an unknown id in a reorder without changing anything', async () => {
    const before = await list()
    const ids = before.map((c) => c.id).reverse()

    await expect(mockRequest('categories.reorder', { categoryIds: [...ids, -1] })).rejects.toThrow('Category not found')
    expect(await list()).toEqual(before)
  })

  it('rejects an empty or blank name and an empty colour', async () => {
    await expect(mockRequest('categories.create', { input: { ...input, name: '' } })).rejects.toThrow(
      'Name must not be empty',
    )
    await expect(mockRequest('categories.create', { input: { ...input, name: '   ' } })).rejects.toThrow(
      'Name must not be empty',
    )
    await expect(mockRequest('categories.create', { input: { ...input, color: '' } })).rejects.toThrow(
      'Color must not be empty',
    )
    const created = await create()
    await expect(mockRequest('categories.update', { id: created.id, input: { ...input, name: ' ' } })).rejects.toThrow(
      'Name must not be empty',
    )
    await mockRequest('categories.delete', { id: created.id })
  })

  it('answers "Category not found" for an unknown id', async () => {
    await expect(mockRequest('categories.update', { id: -1, input })).rejects.toThrow('Category not found')
    await expect(mockRequest('categories.delete', { id: -1 })).rejects.toThrow('Category not found')
    await expect(mockRequest('categories.setRecipes', { id: -1, recipeIds: [] })).rejects.toThrow('Category not found')
  })

  it('returns copies, not the stored categories', async () => {
    const created = await create()
    created.name = 'Verändert'
    created.recipes.push(1)

    expect((await list()).find((c) => c.id === created.id)).toMatchObject({ name: 'Suppen', recipes: [] })
    await mockRequest('categories.delete', { id: created.id })
  })
})
