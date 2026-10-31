// Resolve backend asset hashes/ids to URLs, the single place for the backend's
// asset routes. Mock data maps to files served from /public.

import { apiUrl, rest } from './rest'
import type { ImageId, Tag } from './protocol'
import { isStubbed } from './stubs'

const USE_MOCKS = import.meta.env.VITE_MOCK === '1'

// Public assets live under Vite's base (a sub-path in the Skaile preview).
const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

const tagIconPath = (tag: Tag) => `/tags/${encodeURIComponent(tag.id)}/icon`

// The REST URL needs the bearer, which <img> doesn't send, so it never goes into
// an <img src> directly: components render the object URL from loadTagIcon.
export function tagImageSrc(tag: Tag): string {
  return USE_MOCKS ? publicUrl(`tags/${tag.svg}.svg`) : apiUrl(tagIconPath(tag))
}

// Keyed by id and hash, so a replaced icon gets a fresh entry. Object URLs are
// never revoked: there is at most one per tag. Failures stay cached as null for
// the session (a reload retries) instead of refetching on every render.
const tagIconLoads = new Map<string, Promise<string | null>>()
const tagIconResults = new Map<string, string | null>()
const tagIconKey = (tag: Tag) => `${tag.id}\u0000${tag.svg}`

// Every TagIcon of a tag re-reads the cache when a load settles or an image
// turns out broken, so one failure never shows as a broken image elsewhere.
const tagIconListeners = new Set<() => void>()
const settleTagIcon = (key: string, src: string | null) => {
  tagIconResults.set(key, src)
  tagIconListeners.forEach((notify) => notify())
}

export function subscribeTagIcons(notify: () => void): () => void {
  tagIconListeners.add(notify)
  return () => tagIconListeners.delete(notify)
}

// The backend sends image/svg+xml, but an untyped SVG blob wouldn't render in an
// <img>; raster formats are sniffed from their bytes either way.
const asImage = (blob: Blob) =>
  blob.type === '' || blob.type === 'application/octet-stream' ? new Blob([blob], { type: 'image/svg+xml' }) : blob

// undefined = not settled yet; null = no icon, the load failed or the image is broken.
export function peekTagIcon(tag: Tag): string | null | undefined {
  if (tag.svg === null) return null
  const key = tagIconKey(tag)
  if (tagIconResults.has(key)) return tagIconResults.get(key)
  return USE_MOCKS ? tagImageSrc(tag) : undefined
}

export function loadTagIcon(tag: Tag): Promise<string | null> {
  const known = peekTagIcon(tag)
  if (known !== undefined) return Promise.resolve(known)
  const key = tagIconKey(tag)
  let load = tagIconLoads.get(key)
  if (!load) {
    load = rest
      .getBlob(tagIconPath(tag))
      .then((blob) => URL.createObjectURL(asImage(blob)))
      .catch(() => null)
      .then((src) => {
        settleTagIcon(key, src)
        return src
      })
    tagIconLoads.set(key, load)
  }
  return load
}

// For an <img> that failed to render (e.g. invalid SVG, missing mock file).
export function markTagIconBroken(tag: Tag): void {
  settleTagIcon(tagIconKey(tag), null)
}

// Tests only: the cache is module state and would leak between cases.
export function resetTagIconCache(): void {
  tagIconLoads.clear()
  tagIconResults.clear()
}

// Dev-only: map mock ImageIds → public asset URLs. Any raster/vector format
// works (the browser <img> doesn't care) — id 1 is a real .png, id 2 a .png.
// In production this whole function is just the backend's image URL.
const DEV_RECIPE_IMAGE: Record<number, string> = {
  1: publicUrl('recipes/1.png'),
  2: publicUrl('recipes/cake.png'), // transparent PNG — test fixture for the image backdrop (Schokokuchen)
}

// Backend #9 (B1) / ADR 0003 §5: without an image route, list and detail look as if there were no photo.
export function showsRecipeImages(): boolean {
  return !isStubbed('images')
}

export function recipeImageSrc(id: ImageId): string {
  // Backend #9 (B1): ImageId has no route yet, so in REST only the editor shows this neutral placeholder.
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
  // Mock names would caption the REST placeholder.
  if (isStubbed('images')) return `Bild ${id}`
  return DEV_IMAGE_NAME[id] ?? `Bild ${id}`
}

export function userImageSrc(hash: string): string {
  return publicUrl(`users/${hash}.svg`)
}
