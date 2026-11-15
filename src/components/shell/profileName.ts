import type { User } from '../../api/protocol'

// What the avatar and the profile head show; an empty or missing name falls back instead of rendering blank.
export function profileName(me: Pick<User, 'name'> | null | undefined): { name: string; initial: string } {
  const trimmed = me?.name.trim() ?? ''
  return { name: trimmed || 'Profil', initial: (trimmed[0] ?? '?').toUpperCase() }
}
