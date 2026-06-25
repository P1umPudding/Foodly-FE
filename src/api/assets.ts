// Resolve backend asset hashes/ids to URLs. The real hash→URL scheme is
// backend-dependent and still TBD; in dev the mocks store filename stems served
// from /public. Centralised so there's a single place to wire the real scheme.

import type { ImageId } from './protocol'

export function tagImageSrc(hash: string): string {
  return `/tags/${hash}.svg`
}

// Dev-only: map mock ImageIds → public asset URLs. Any raster/vector format
// works (the browser <img> doesn't care) — id 1 is a real .png, id 2 a .svg.
// In production this whole function is just the backend's image URL.
const DEV_RECIPE_IMAGE: Record<number, string> = {
  1: '/recipes/1.png',
  2: '/recipes/2.svg',
}

export function recipeImageSrc(id: ImageId): string {
  return DEV_RECIPE_IMAGE[id] ?? `/recipes/${id}.svg`
}

// Dev-only image display names (the real `Image.name` comes from the backend).
const DEV_IMAGE_NAME: Record<number, string> = {
  1: 'Fertiger Teller',
  2: 'Anschnitt',
  3: 'Im Topf (Hochformat)',
  4: 'Angerichtet (Querformat)',
}

export function imageName(id: ImageId): string {
  return DEV_IMAGE_NAME[id] ?? `Bild ${id}`
}

export function userImageSrc(hash: string): string {
  return `/users/${hash}.svg`
}
