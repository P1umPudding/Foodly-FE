import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle, Button, Spinner, toast } from '@postxl/ui-components'
import { EditorSkeleton } from '../components/editor/EditorSkeleton'
import { SAFE_BOTTOM } from '../components/editor/layout'
import { ErrorState } from '../components/StateCard'
import { AlertTriangle, Plus } from 'lucide-react'
import { foodly } from '../api'
import { errorMessage } from '../lib/errorMessage'
import { trackPendingSave } from '../api/pendingSaves'
import { useRequest } from '../hooks/useRequest'
import { useHasAppHistory } from '../hooks/useHasAppHistory'
import { useCurrentUserId, useRefreshCategories } from '../catalog/CatalogProvider'
import { canEdit } from '../editor/access'
import { addImage, emptyDraft, move, newSection, sizeNumberError, toCreateRecipe, toDraft } from '../editor/draft'
import type { Draft } from '../editor/draft'
import { useAutosave } from '../editor/useAutosave'
import { BasicsCard } from '../components/editor/BasicsCard'
import { EditorSidebar } from '../components/editor/EditorSidebar'
import { SectionEditor } from '../components/editor/SectionEditor'
import { SaveStatusIndicator } from '../components/editor/SaveStatus'
import { HeaderActions } from '../components/shell/PageHeader'
import { Page } from '../components/shell/Page'
import { TriggerButton } from '../components/TriggerButton'
import type { RecipeId } from '../api/protocol'

export function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentUserId = useCurrentUserId()
  const refreshCategories = useRefreshCategories()

  // One component, two modes. `recipeId` is null on /recipes/new until Anlegen
  // succeeds, and that null is exactly what keeps autosave switched off.
  const [recipeId, setRecipeId] = useState<RecipeId | null>(id ? Number(id) : null)
  const isNew = id === undefined

  const {
    status,
    data: loaded,
    reload,
  } = useRequest(() => (isNew ? Promise.resolve(null) : foodly.getRecipe(Number(id))), [id])

  const [draft, setDraft] = useState<Draft | null>(isNew ? emptyDraft() : null)
  const loadedDraft = useRef<Draft | null>(null)
  // Focus target after a section's "Entfernen": its menu trigger is gone.
  const addSection = useRef<HTMLButtonElement>(null)
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

  // The header's back arrow on the detail page walks back through history, so Fertig must not leave the editor behind
  // the detail: otherwise Zurück -> editor -> Fertig -> detail -> Zurück would loop and never reach the list. `fromDetail` is
  // set only by RecipeDetail's Bearbeiten link, so the entry right behind this one is that detail page.
  const openedFromDetail = (location.state as { fromDetail?: unknown } | null)?.fromDetail === true
  const hasAppHistory = useHasAppHistory()
  const leaveToDetail = () => {
    if (openedFromDetail && hasAppHistory()) navigate(-1)
    else navigate(`/recipes/${recipeId}`, { replace: true })
  }

  const [uploading, setUploading] = useState(false)

  // "Fertig" waits for the save: the detail page re-fetches on mount, and a GET
  // that overtakes a still-running PUT would show the old recipe.
  const [finishing, setFinishing] = useState(false)
  const finishingRef = useRef(false)
  const finish = async () => {
    // aria-disabled (not disabled) keeps focus on the button, so clicks still arrive: drop repeats here.
    if (finishingRef.current || sizeError !== null || uploading) return
    finishingRef.current = true
    setFinishing(true)
    try {
      await flush()
      // Left via another route meanwhile: don't pull the user back.
      if (alive.current) {
        leaveToDetail()
        // Stay locked: going back unmounts only on popstate, and a repeat in between would step back twice.
        return
      }
    } catch {
      // The save status indicator already shows the error with a retry.
    }
    finishingRef.current = false
    if (alive.current) setFinishing(false)
  }

  // While the POST runs the form is locked (edits made meanwhile would not be in the POST), but the user may still leave
  // via the sidebar or Back: the recipe is created anyway, without pulling them back into the editor.
  const [creating, setCreating] = useState(false)
  const creatingRef = useRef(false)
  const cannotCreate = draft === null || draft.name.trim() === '' || sizeError !== null || uploading

  const create = async () => {
    // aria-disabled keeps the button focusable, so Enter/Space still arrive here: guard everything again.
    if (!draft || creatingRef.current || cannotCreate) return
    creatingRef.current = true
    setCreating(true)
    try {
      const created = await foodly.createRecipe(toCreateRecipe(draft))
      // A new recipe can't be given a category yet, so this changes nothing today; keeps the sidebar right once it can.
      refreshCategories()
      setRecipeId(created.id)
      if (alive.current) navigate(`/recipes/${created.id}/edit`, { replace: true })
    } catch (e) {
      toast.error(`Rezept konnte nicht angelegt werden: ${errorMessage(e, 'unbekannter Fehler')}`)
    } finally {
      creatingRef.current = false
      if (alive.current) setCreating(false)
    }
  }

  // The shell header shows the title visibly; the sr-only h1 keeps one page heading for screen readers,
  // also while loading and on error.
  const heading = <h1 className="sr-only">{isNew ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1>

  const patch = (p: Partial<Draft>) => setDraft((d) => (d === null ? d : { ...d, ...p }))

  // REST errors carry no status, so "not found" and "server unreachable" look the same: the detail page's neutral
  // card, no raw backend message.
  if (status === 'error') {
    return (
      <Page className={`pb-10 ${SAFE_BOTTOM}`}>
        {heading}
        <ErrorState
          title="Rezept konnte nicht geladen werden"
          description="Vielleicht wurde es gelöscht, oder der Server ist gerade nicht erreichbar."
          onRetry={reload}
          extraAction={
            <Button asChild variant="outline" size="sm">
              <Link to="/recipes">Zur Liste</Link>
            </Button>
          }
        />
      </Page>
    )
  }

  if (!editable) {
    return (
      <div className={`mx-auto max-w-3xl px-6 py-10 ${SAFE_BOTTOM}`}>
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
      <Page className={`pb-10 ${SAFE_BOTTOM}`}>
        {heading}
        <EditorSkeleton data-testid="editor-skeleton" />
      </Page>
    )
  }

  return (
    <Page className={`pb-10 ${SAFE_BOTTOM}`}>
      {heading}

      {/* `contents`: the fieldset only disables its controls during Anlegen, it adds no box of its own. */}
      <fieldset disabled={creating} className="contents">
        {/* Desktop: main column + side column (mockup `.editor`). Phone: both columns dissolve into one flow, ordered
            by the side column's blocks (images first, notes/source/hint last). DOM order stays main → side. */}
        <div className="grid grid-cols-[minmax(0,1fr)_280px] items-start gap-8 phone:flex phone:flex-col phone:gap-5">
          <div className="flex flex-col gap-[18px] phone:contents">
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
                onRemovedFocus={() => addSection.current?.focus()}
                showTimerHint={i === 0}
              />
            ))}

            <div className="flex flex-col gap-1.5">
              <TriggerButton
                ref={addSection}
                variant="outline"
                className="w-full gap-1.5 border-dashed text-muted-foreground touch:h-10"
                onClick={() => patch({ sections: [...draft.sections, newSection()] })}
              >
                <Plus className="size-4" />
                Abschnitt hinzufügen
              </TriggerButton>
              <p className="text-xs text-muted-foreground">
                Abschnitte nur, wenn das Rezept Teile hat (z. B. Soße und Pasta). Ein Abschnitt ohne Namen ist der
                Normalfall.
              </p>
            </div>
          </div>

          {/* top: header (60 px) + the page's top padding. */}
          <div className="sticky top-[84px] flex flex-col gap-[22px] phone:contents">
            <EditorSidebar
              draft={draft}
              onChange={patch}
              onAddImage={(image) => setDraft((d) => (d === null ? d : addImage(d, image)))}
              onUploadingChange={setUploading}
              uploadDisabled={finishing}
            />
          </div>
        </div>
      </fieldset>

      <HeaderActions>
        {isNew ? (
          <Button
            onClick={() => void create()}
            aria-disabled={creating || cannotCreate}
            aria-busy={creating}
            className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 touch:h-10"
          >
            {creating && <Spinner className="size-4" />}
            Anlegen
          </Button>
        ) : (
          <>
            {/* A save of the last valid draft still running, or failed with its retry, stays visible next to the hint. */}
            {(sizeError === null || saveStatus.state === 'saving' || saveStatus.state === 'error') && (
              <SaveStatusIndicator status={saveStatus} onRetry={retry} />
            )}
            {/* Polite, not an alert: it flips while typing; the field's own error text waits for blur. Always mounted
                (the header slot is too), since screen readers often skip a live region that appears together with its
                text. (Old data invalid on load is the exception; there the field shows its error at once.) */}
            <span role="status" className="flex items-center gap-1.5 text-sm text-destructive">
              {sizeError !== null && (
                <>
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="phone:sr-only">
                    {saveStatus.state === 'error' ? 'Portionen prüfen' : 'Nicht gespeichert – Portionen prüfen'}
                  </span>
                </>
              )}
            </span>
            <Button
              onClick={() => void finish()}
              aria-disabled={finishing || sizeError !== null || uploading}
              aria-busy={finishing}
              className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 touch:h-10"
            >
              {finishing && <Spinner className="size-4" />}
              Fertig
            </Button>
          </>
        )}
      </HeaderActions>
    </Page>
  )
}
