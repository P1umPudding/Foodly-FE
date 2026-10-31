// Tag tokens in recipe-authored strings, shared by TagText (rendering) and the time-chip parser.
import type { Tag } from '../api/protocol'

// {X} or {!X}; X = tag id (anything but braces). Global flag: use it with matchAll/replace only, never exec/test
// (they would share lastIndex between callers).
export const TAG_TOKEN = /\{(!?)([^{}]+)\}/g

// Where the tag tokens sit in a string, so other parsers (time chips) can leave them alone.
export function tagTokenRanges(value: string): Array<{ start: number; end: number }> {
  return [...value.matchAll(TAG_TOKEN)].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
}

// A tag-token string as plain text (e.g. for a timer label): known tags become their name, unknown
// tokens stay literal — the same choice TagText makes.
export function plainTagText(value: string, byId: Record<string, Tag>): string {
  return value.replace(TAG_TOKEN, (full, _bang: string, id: string) => (byId[id] ? id : full))
}
