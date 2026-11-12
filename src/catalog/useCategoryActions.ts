// The one way to write categories: calls foodly.* and updates the catalog afterwards, so the sidebar, filters and
// groups follow without a reload. Errors are rethrown for the caller to show.
import { useMemo } from 'react'
import { foodly } from '../api'
import { useCategoryWriter } from './CatalogProvider'
import type { CategoryInput, RecipeId, UserCategory, UserCategoryId } from '../api/protocol'

export function useCategoryActions() {
  const writer = useCategoryWriter()

  return useMemo(() => {
    // Not loaded yet (or failed): the write landed, so load the list instead of patching an incomplete one.
    const afterWrite = (change: (list: UserCategory[]) => UserCategory[]) => {
      if (!writer.patch(change)) writer.refresh()
    }
    const replace = (category: UserCategory) => {
      afterWrite((list) => list.map((c) => (c.id === category.id ? category : c)))
      return category
    }

    return {
      create: async (input: CategoryInput): Promise<UserCategory> => {
        const created = await foodly.createCategory(input)
        afterWrite((list) => [...list, created])
        return created
      },
      update: async (id: UserCategoryId, input: CategoryInput): Promise<UserCategory> =>
        replace(await foodly.updateCategory(id, input)),
      remove: async (id: UserCategoryId): Promise<void> => {
        await foodly.deleteCategory(id)
        afterWrite((list) => list.filter((c) => c.id !== id))
      },
      setRecipes: async (id: UserCategoryId, recipeIds: RecipeId[]): Promise<UserCategory> =>
        replace(await foodly.setCategoryRecipes(id, recipeIds)),
      reorder: writer.reorder,
    }
  }, [writer])
}
