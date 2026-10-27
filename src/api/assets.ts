// Resolve backend asset hashes/ids to URLs. The real hash→URL scheme is
// backend-dependent and still TBD; in dev the mocks store filename stems served
// from /public. Centralised so there's a single place to wire the real scheme.

import type { ImageId } from './protocol'

// Public assets live under Vite's base (a sub-path in the Skaile preview).
const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

export function tagImageSrc(hash: string): string {
  return publicUrl(`tags/${hash}.svg`)
}

// Dev-only: map mock ImageIds → public asset URLs. Any raster/vector format
// works (the browser <img> doesn't care) — id 1 is a real .png, id 2 a .png.
// In production this whole function is just the backend's image URL.
const DEV_RECIPE_IMAGE: Record<number, string> = {
  1: publicUrl('recipes/1.png'),
  2: publicUrl('recipes/cake.png'), // transparent PNG — test fixture for the image backdrop (Schokokuchen)
}

export function recipeImageSrc(id: ImageId): string {
  return DEV_RECIPE_IMAGE[id] ?? publicUrl(`recipes/${id}.svg`)
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
  return publicUrl(`users/${hash}.svg`)
}
