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
    const afterWrite = (change: (list: UserCategory[]) => UserCategory[]): boolean => {
      const patched = writer.patch(change)
      if (!patched) writer.refresh()
      return patched
    }
    // An id the list doesn't know (e.g. created in another tab) means the list is outdated: load it.
    const replace = (category: UserCategory) => {
      let known = false
      const patched = afterWrite((list) =>
        list.map((c) => {
          if (c.id !== category.id) return c
          known = true
          return category
        }),
      )
      if (patched && !known) writer.refresh()
      return category
    }

    return {
      create: async (input: CategoryInput): Promise<UserCategory> => {
        const created = await foodly.createCategory(input)
        // A load answered after the POST may already hold it.
        afterWrite((list) =>
          list.some((c) => c.id === created.id)
            ? list.map((c) => (c.id === created.id ? created : c))
            : [...list, created],
        )
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
