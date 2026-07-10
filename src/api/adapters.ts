import type { Recipe, RecipePreview } from './protocol'

// The list endpoints return a preview without sections/notes/images. The list UI
// never reads those, so fill them empty to satisfy the Recipe shape.
export function previewToRecipe(preview: RecipePreview): Recipe {
  return { ...preview, sections: [], notes: [], images: [] }
}
