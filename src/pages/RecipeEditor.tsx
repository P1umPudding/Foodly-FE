import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle, Button, Skeleton, Spinner, toast } from '@postxl/ui-components'
import { AlertTriangle, Plus } from 'lucide-react'
import { foodly } from '../api'
import { trackPendingSave } from '../api/pendingSaves'
import { useRequest } from '../hooks/useRequest'
import { useCurrentUserId } from '../catalog/CatalogProvider'
import { canEdit } from '../editor/access'
import { emptyDraft, move, newSection, sizeNumberError, toCreateRecipe, toDraft } from '../editor/draft'
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
  const loadedDraft = useRef<Draft | null>(null)
  useEffect(() => {
    if (!loaded) return
    const next = toDraft(loaded)
    loadedDraft.current = next
    setDraft(next)
  }, [loaded])

  // An invalid portion count must never be saved, yet the field has to keep what was typed. So autosave gets
  // the last valid draft: while the count is invalid nothing new is sent, and the first valid draft after it
  // (carrying every edit made meanwhile) is. Adjusted during render, so a freshly loaded draft and autosave
  // switching on still land in one commit (useAutosave's contract). Old data loaded with an invalid count leaves
  // `savable` null, so the autosave baseline is null and the first valid draft is saved.
  const sizeError = draft ? sizeNumberError(draft) : null
  const [savable, setSavable] = useState(draft)
  if (sizeError === null && savable !== draft) setSavable(draft)

  // Edits held back by an invalid count are lost when the editor is left: warn on tab close, toast on leaving.
  // Untouched old data (draft still the loaded one) and new recipes (never autosaved) have nothing to lose.
  const unsavedInvalid = recipeId !== null && sizeError !== null && draft !== savable && draft !== loadedDraft.current
  const unsavedInvalidRef = useRef(false)
  useEffect(() => {
    unsavedInvalidRef.current = unsavedInvalid
  })
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedInvalidRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (unsavedInvalidRef.current) toast.error('Änderungen nicht gespeichert – Portionen prüfen.')
    }
  }, [])

  const editable = loaded === null ? true : canEdit(loaded, currentUserId)

  // `draft !== null` matters: autosave must stay off until the recipe has loaded,
  // otherwise the null -> loaded transition would be saved back as if it were an edit.
  const {
    status: saveStatus,
    retry,
    flush,
  } = useAutosave(
    savable,
    async (value) => {
      if (value === null || recipeId === null) return
      await foodly.updateRecipe(recipeId, toCreateRecipe(value))
    },
    {
      enabled: draft !== null && recipeId !== null && editable,
      // The unmount-flush save outlives the component that would have shown
      // its status, so a failure needs a channel that doesn't need one.
      onFlushError: () => toast.error('Änderungen konnten nicht gespeichert werden.'),
      // Leaving any other way than "Fertig" doesn't wait for the save; the next page's
      // read of this recipe waits instead.
      onUnmountFlush: (done) => {
        if (recipeId !== null) trackPendingSave(recipeId, done)
      },
    },
  )

  // StrictMode-safe: re-armed on every (re)mount, like `mounted` in useAutosave.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // "Fertig" waits for the save: the detail page re-fetches on mount, and a GET
  // that overtakes a still-running PUT would show the old recipe.
  const [finishing, setFinishing] = useState(false)
  const finishingRef = useRef(false)
  const finish = async () => {
    // aria-disabled (not disabled) keeps focus on the button, so clicks still arrive: drop repeats here.
    if (finishingRef.current || sizeError !== null) return
    finishingRef.current = true
    setFinishing(true)
    try {
      await flush()
      // Left via another route meanwhile: don't pull the user back.
      if (alive.current) navigate(`/recipes/${recipeId}`)
    } catch {
      // The save status indicator already shows the error with a retry.
    } finally {
      finishingRef.current = false
      if (alive.current) setFinishing(false)
    }
  }

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

  // The shell header shows the title visibly; the sr-only h1 keeps one page heading for screen readers,
  // also while loading and on error.
  const heading = <h1 className="sr-only">{isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1>

  const patch = (p: Partial<Draft>) => setDraft((d) => (d === null ? d : { ...d, ...p }))

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        {heading}
        <Alert variant="destructive">
          <AlertTitle>Rezept nicht gefunden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/recipes">Zur Liste</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        {heading}
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
        {heading}
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-28">
      {heading}

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

      <div className="fixed right-0 bottom-[var(--shell-bottom,0px)] left-[var(--shell-left,0px)] border-t border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          {isNew ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/recipes">Verwerfen</Link>
              </Button>
              <div className="flex items-center gap-3">
                {createError && <span className="text-destructive">{createError}</span>}
                <Button onClick={create} disabled={creating || draft.name.trim() === '' || sizeError !== null}>
                  Anlegen
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {/* A failed save of the last valid draft keeps its retry next to the hint. */}
                {(sizeError === null || saveStatus.state === 'error') && (
                  <SaveStatusIndicator status={saveStatus} onRetry={retry} />
                )}
                {/* Polite, not an alert: it flips while typing; the field's own error text waits for blur. Always
                    mounted, since screen readers often skip a live region that appears together with its text. */}
                <span role="status" className="flex items-center gap-2 text-destructive">
                  {sizeError !== null && (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      {saveStatus.state === 'error' ? 'Portionen prüfen' : 'Nicht gespeichert – Portionen prüfen'}
                    </>
                  )}
                </span>
              </div>
              <Button
                onClick={finish}
                aria-disabled={finishing || sizeError !== null}
                aria-busy={finishing}
                className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                {finishing && <Spinner className="size-4" />}
                Fertig
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
