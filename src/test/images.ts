import type { ImageRef } from '../api/protocol'

export const ref = (id: number): ImageRef => ({ id, hash: `h${id}`, name: null })
