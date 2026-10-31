// Resolve backend asset hashes/ids to URLs. The real hash→URL scheme is
// backend-dependent and still TBD; mock data maps to files served from /public.
// Centralised so there's a single place to wire the real scheme.

import type { ImageId } from './protocol'
import { isStubbed } from './stubs'

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
  // Backend #9 (B1): ImageId has no route yet, so REST shows a neutral placeholder (ADR 0003 §5).
  if (isStubbed('images')) return publicUrl('recipes/placeholder.svg')
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
  if (isStubbed('images')) return `Bild ${id}`
  return DEV_IMAGE_NAME[id] ?? `Bild ${id}`
}

export function userImageSrc(hash: string): string {
  return publicUrl(`users/${hash}.svg`)
}
