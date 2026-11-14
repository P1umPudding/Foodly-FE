import { Input, Label } from '@postxl/ui-components'
import type { ReactNode } from 'react'
import { ImageManager } from './ImageManager'
import { NotesEditor } from './NotesEditor'
import type { Draft } from '../../editor/draft'
import type { ImageRef } from '../../api/protocol'

// Mockup `.col-h`: the small grey heading of each side-column block.
const COL_HEAD = 'mb-1.5 text-xs font-semibold text-muted-foreground'

// The editor's side column (mockup `.ed-side`): Bilder, Notizen, Quelle and a hint. Its blocks are direct children of
// the column on purpose: on the phone the column dissolves (`contents`) and the blocks join the main column's flow,
// images first and the rest after the sections, ordered via `order-*`.
export function EditorSidebar({
  draft,
  onChange,
  onAddImage,
  onUploadingChange,
}: {
  draft: Draft
  onChange: (patch: Partial<Draft>) => void
  onAddImage: (image: ImageRef) => void
  onUploadingChange: (uploading: boolean) => void
}) {
  return (
    <>
      <Block className="phone:order-first">
        <h2 className={`${COL_HEAD} phone:sr-only`}>Bilder</h2>
        <ImageManager
          mainImage={draft.mainImage}
          images={draft.images}
          onChange={onChange}
          onAdd={onAddImage}
          onUploadingChange={onUploadingChange}
        />
      </Block>
      <Block className="phone:order-last">
        <h2 className={COL_HEAD}>Notizen</h2>
        <NotesEditor notes={draft.notes} onChange={(notes) => onChange({ notes })} />
      </Block>
      <Block className="phone:order-last">
        <Label htmlFor="recipe-source" className={COL_HEAD}>
          Quelle
        </Label>
        <Input
          id="recipe-source"
          value={draft.source}
          placeholder="Omas Rezept oder https://…"
          onChange={(e) => onChange({ source: e.target.value })}
        />
      </Block>
      <p className="text-xs text-muted-foreground phone:order-last">
        Kategorien setzt du im Rezept über „+“ – gehört nicht zum Rezept selbst.
      </p>
    </>
  )
}

function Block({ className, children }: { className: string; children: ReactNode }) {
  return <section className={`flex flex-col ${className}`}>{children}</section>
}
