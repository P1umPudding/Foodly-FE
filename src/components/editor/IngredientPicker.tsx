import { useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@postxl/ui-components'
import { ChevronsUpDown } from 'lucide-react'
import { useIngredients } from '../../catalog/CatalogProvider'
import type { IngredientId } from '../../api/protocol'

// The catalog is read-only (no create-ingredient endpoint), so anything not in it
// has to survive as free text — which is exactly what RecipeIngredient.text is for.
export function IngredientPicker({
  value,
  text,
  onPick,
  onText,
}: {
  value: IngredientId | null
  text: string
  onPick: (id: IngredientId) => void
  onText: (text: string) => void
}) {
  const { byId } = useIngredients()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const all = Object.values(byId)
  const matches = all.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
  const label = value !== null ? (byId[value]?.name ?? '') : text
  const typed = query.trim()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
          <span className={label === '' ? 'text-muted-foreground' : undefined}>{label === '' ? 'Zutat …' : label}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Zutat suchen …" value={query} onValueChange={setQuery} />
          <CommandList>
            {matches.length === 0 && typed === '' && <CommandEmpty>Keine Zutaten im Katalog.</CommandEmpty>}
            <CommandGroup>
              {matches.map((ingredient) => (
                <CommandItem
                  key={ingredient.id}
                  value={ingredient.name}
                  onSelect={() => {
                    onPick(ingredient.id)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  {ingredient.name}
                </CommandItem>
              ))}
              {typed !== '' && (
                <CommandItem
                  value={`__freetext_${typed}`}
                  onSelect={() => {
                    onText(typed)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  „{typed}" als Freitext übernehmen
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
