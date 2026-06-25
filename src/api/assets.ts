// Resolve backend asset hashes/ids to URLs. The real hash→URL scheme is
// backend-dependent and still TBD; in dev the mocks store filename stems served
// from /public. Centralised so there's a single place to wire the real scheme.

import type { ImageId } from './protocol';

export function tagImageSrc(hash: string): string {
  return `/tags/${hash}.svg`;
}

// Dev-only: map mock ImageIds → public asset URLs. Any raster/vector format
// works (the browser <img> doesn't care) — id 1 is a real .png, id 2 a .svg.
// In production this whole function is just the backend's image URL.
const DEV_RECIPE_IMAGE: Record<number, string> = {
  1: '/recipes/1.png',
  2: '/recipes/2.svg',
};

export function recipeImageSrc(id: ImageId): string {
  return DEV_RECIPE_IMAGE[id] ?? `/recipes/${id}.svg`;
}

export function userImageSrc(hash: string): string {
  return `/users/${hash}.svg`;
}
