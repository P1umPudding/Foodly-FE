import { useState } from 'react'
import { Search } from 'lucide-react'
import { useIngredients } from '../../catalog/CatalogProvider'
import type { IngredientId } from '../../api/protocol'
import { SuggestInput } from './SuggestInput'

const FREE_TEXT = '__freetext'

// The catalog is read-only (no create-ingredient endpoint), so anything not in it has to survive as free text, which
// is exactly what RecipeIngredient.text is for. What is typed stays local until it is committed (a hit is picked, the
// free-text entry chosen, or the field left with changed text): a stray keystroke on a catalog row must not drop the
// catalog link and its Zusatz, and autosave would store that right away. Escape reverts, and so does leaving the field
// empty: an empty name would make the save drop the whole row (Menge included); removing a row is "Entfernen".
export function IngredientPicker({
  value,
  text,
  onPick,
  onText,
  className,
}: {
  value: IngredientId | null
  text: string
  onPick: (id: IngredientId) => void
  onText: (text: string) => void
  className?: string
}) {
  const { byId } = useIngredients()
  const [typed, setTyped] = useState<string | null>(null)

  const stored = value !== null ? (byId[value]?.name ?? '') : text
  const q = (typed ?? '').trim()
  const lower = q.toLowerCase()
  // No list for an empty field: Enter would otherwise silently link the first catalog entry.
  const matches = q === '' ? [] : Object.values(byId).filter((i) => i.name.toLowerCase().includes(lower))
  const exact = matches.find((i) => i.name.toLowerCase() === lower)

  const commitText = () => {
    setTyped(null)
    if (typed === null || q === '') return
    // A catalog name typed in full links that entry (the list offers no free-text entry for it either), and a case-only
    // change on a catalog row keeps its link and Zusatz. Free text takes any change, capitalisation included.
    if (exact) {
      if (exact.id !== value) onPick(exact.id)
    } else if (value !== null ? lower !== stored.toLowerCase() : q !== stored) {
      onText(q)
    }
  }

  return (
    <SuggestInput
      label="Zutat"
      placeholder="Zutat"
      className={className}
      icon={<Search className="size-4" />}
      value={typed ?? stored}
      onValueChange={setTyped}
      suggestions={[
        ...matches.map((i) => ({ id: String(i.id), label: i.name })),
        ...(q !== '' && !exact ? [{ id: FREE_TEXT, label: `„${q}“ als Freitext übernehmen` }] : []),
      ]}
      onSelect={(id) => {
        if (id === FREE_TEXT) return commitText()
        onPick(Number(id))
        setTyped(null)
      }}
      onEscape={() => setTyped(null)}
      onBlur={commitText}
    />
  )
}
