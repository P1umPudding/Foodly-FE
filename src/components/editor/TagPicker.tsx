import { useState } from 'react'
import {
  Badge,
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
import { Plus, X } from 'lucide-react'
import { useTags } from '../../catalog/CatalogProvider'
import { TagIcon } from '../TagText'
import type { TagId } from '../../api/protocol'

// Selection only: the backend has no create-tag endpoint, and a recipe naming an
// unknown tag is rejected with 422.
export function TagPicker({ value, onChange }: { value: TagId[]; onChange: (tags: TagId[]) => void }) {
  const { byId } = useTags()
  const [open, setOpen] = useState(false)

  const available = Object.keys(byId).filter((id) => !value.includes(id))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((id) => (
        <Badge key={id} variant="secondary" className="gap-1">
          {byId[id]?.svg && <TagIcon hash={byId[id].svg!} alt={id} size="sm" />}
          {id}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0"
            aria-label={`${id} entfernen`}
            onClick={() => onChange(value.filter((t) => t !== id))}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" role="combobox" className="gap-1.5">
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Tag suchen …" />
            <CommandList>
              <CommandEmpty>Kein passender Tag.</CommandEmpty>
              <CommandGroup>
                {available.map((id) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => {
                      onChange([...value, id])
                      setOpen(false)
                    }}
                  >
                    {byId[id]?.svg && <TagIcon hash={byId[id].svg!} alt={id} size="sm" />}
                    {id}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
