// Mock image refs: recipes.json and write bodies hold bare ids, reads return ImageRefs (Backend #19).

import type { ImageId, ImageRef } from '../api/protocol'

const DEV_IMAGE_NAME: Record<number, string> = {
  1: 'Fertiger Teller',
  2: 'Anschnitt',
  3: 'Im Topf (Hochformat)',
  4: 'Angerichtet (Querformat)',
}

// Pure on purpose, no store: uploads take ids from nextId (≥ 10 000), so they never hit a DEV name and
// rebuilding the ref on save yields exactly what the upload returned.
export function imageRef(id: ImageId): ImageRef {
  return { id, hash: `mock-${id}`, name: DEV_IMAGE_NAME[id] ?? null }
}

export function withImageRefs(r: { mainImage: ImageId | null; images: ImageId[] }): {
  mainImage: ImageRef | null
  images: ImageRef[]
} {
  return { mainImage: r.mainImage === null ? null : imageRef(r.mainImage), images: r.images.map(imageRef) }
}
