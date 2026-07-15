import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components'
import { Plus } from 'lucide-react'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { canEdit } from '../editor/access'
import { emptyDraft, move, newSection, toCreateRecipe, toDraft } from '../editor/draft'
import type { Draft } from '../editor/draft'
import { useAutosave } from '../editor/useAutosave'
import { BasicsCard } from '../components/editor/BasicsCard'
import { ImageManager } from '../components/editor/ImageManager'
import { SectionEditor } from '../components/editor/SectionEditor'
import { SaveStatusIndicator } from '../components/editor/SaveStatus'
import type { RecipeId } from '../api/protocol'

export function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUserId = useCurrentUserId()

  // One component, two modes. `recipeId` is null on /recipes/new until Anlegen
  // succeeds, and that null is exactly what keeps autosave switched off.
  const [recipeId, setRecipeId] = useState<RecipeId | null>(id ? Number(id) : null)
  const isNew = id === undefined

  const {
    status,
    data: loaded,
    error,
  } = useRequest(() => (isNew ? Promise.resolve(null) : foodly.getRecipe(Number(id))), [id])

  const [draft, setDraft] = useState<Draft | null>(isNew ? emptyDraft() : null)
  useEffect(() => {
    if (loaded) setDraft(toDraft(loaded))
  }, [loaded])

  const editable = loaded === null ? true : canEdit(loaded, currentUserId)

  // `draft !== null` matters: autosave must stay off until the recipe has loaded,
  // otherwise the null -> loaded transition would be saved back as if it were an edit.
  const { status: saveStatus, retry } = useAutosave(
    draft,
    async (value) => {
      if (value === null || recipeId === null) return
      await foodly.updateRecipe(recipeId, toCreateRecipe(value))
    },
    { enabled: draft !== null && recipeId !== null && editable },
  )

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const create = async () => {
    if (!draft) return
    setCreating(true)
    setCreateError(null)
    try {
      const created = await foodly.createRecipe(toCreateRecipe(draft))
      setRecipeId(created.id)
      navigate(`/recipes/${created.id}/edit`, { replace: true })
    } catch (e) {
      setCreateError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const patch = (p: Partial<Draft>) => setDraft((d) => (d === null ? d : { ...d, ...p }))

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Alert variant="destructive">
          <AlertTitle>Rezept nicht gefunden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Zur Liste</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Alert variant="destructive">
          <AlertTitle>Kein Zugriff</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>Dieses Rezept darfst du nur ansehen.</span>
            <Button asChild variant="outline" size="sm">
              <Link to={`/recipes/${id}`}>Zum Rezept</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (draft === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-28">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1>
      </div>

      <div className="flex flex-col gap-4">
        <BasicsCard draft={draft} onChange={patch} />

        {draft.sections.map((section, i) => (
          <SectionEditor
            key={section.key}
            section={section}
            index={i}
            total={draft.sections.length}
            onChange={(next) => patch({ sections: draft.sections.map((s) => (s.key === section.key ? next : s)) })}
            onUp={() => patch({ sections: move(draft.sections, section.key, -1) })}
            onDown={() => patch({ sections: move(draft.sections, section.key, 1) })}
            onRemove={() => patch({ sections: draft.sections.filter((s) => s.key !== section.key) })}
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          className="self-start gap-1.5"
          onClick={() => patch({ sections: [...draft.sections, newSection()] })}
        >
          <Plus className="h-4 w-4" />
          Abschnitt hinzufügen
        </Button>

        <ImageManager mainImage={draft.mainImage} images={draft.images} onChange={patch} />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          {isNew ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/">Verwerfen</Link>
              </Button>
              <div className="flex items-center gap-3">
                {createError && <span className="text-destructive">{createError}</span>}
                <Button onClick={create} disabled={creating || draft.name.trim() === ''}>
                  Anlegen
                </Button>
              </div>
            </>
          ) : (
            <>
              <SaveStatusIndicator status={saveStatus} onRetry={retry} />
              <Button asChild>
                <Link to={`/recipes/${recipeId}`}>Fertig</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
