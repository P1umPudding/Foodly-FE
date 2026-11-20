// Cook mode (/recipes/:id/cook): the recipe step by step, full screen without the shell (#209). The current step lives
// only in state, so a reload starts at step 1 again; App keys the page on the id.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Progress, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { Check, ChefHat, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { foodly } from '../api'
import { useCurrentUserId, useTags } from '../catalog/CatalogProvider'
import { CompactToggle } from '../components/CompactToggle'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/StateCard'
import { TagText } from '../components/TagText'
import { TriggerButton } from '../components/TriggerButton'
import { MugIcon } from '../components/WakeLockToggle'
import { StepText } from '../components/recipe/StepText'
import {
  CookIngredientsColumn,
  CookIngredientsSheet,
  hasIngredients,
  useIngredientSheet,
} from '../components/cook/CookIngredients'
import { CookNeed } from '../components/cook/CookNeed'
import { plainTagText } from '../components/tagTokens'
import { openRecipe, useCheckedIngredients } from '../cook/checkedIngredients'
import { parseSize, sizeOnly, withSize } from '../cook/size'
import { flattenSteps, nextStep, type CookStep } from '../cook/steps'
import { canEdit } from '../editor/access'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHasAppHistory } from '../hooks/useHasAppHistory'
import { useIsWideDesktop } from '../hooks/useIsDesktop'
import { useRequest } from '../hooks/useRequest'
import { useWakeLock } from '../hooks/useWakeLock'
import { TimerPanel } from '../timers/TimerPanel'
import { useTimerPanel } from '../timers/TimerPanelContext'

// More steps than this and the dots give way to "x / y".
const MAX_DOTS = 12

export function CookMode() {
  const { id } = useParams()
  const recipeId = Number(id)
  const { status, data: recipe, reload } = useRequest(() => foodly.getRecipe(recipeId), [recipeId])
  const { byId: tags } = useTags()
  const currentUserId = useCurrentUserId()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const hasAppHistory = useHasAppHistory()
  const timerPanel = useTimerPanel()
  const wakeLock = useWakeLock(true)
  const [index, setIndex] = useState(0)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const { checkedIds, toggle } = useCheckedIngredients(recipeId)
  const wide = useIsWideDesktop()
  const sheet = useIngredientSheet(wide)
  // The size cook mode was opened with, as the raw params: the recipe (and its sizeNumber) may still be loading.
  const [arrivalSize] = useState(() => sizeOnly(searchParams).toString())

  useEffect(() => {
    openRecipe(recipeId)
  }, [recipeId])

  const plainName = recipe ? plainTagText(recipe.name, tags) : ''
  useDocumentTitle(recipe ? `Kochen: ${plainName} · Foodly` : 'Kochen · Foodly')

  const steps = recipe ? flattenSteps(recipe.sections) : []
  const stepCount = steps.length
  const query = sizeOnly(searchParams).toString()
  const detailHref = `/recipes/${id}${query ? `?${query}` : ''}`
  const sizeNumber = recipe?.sizeNumber ?? null
  const factor = parseSize(searchParams, sizeNumber)
  const setFactor = (next: number) => setSearchParams((p) => withSize(p, next, sizeNumber), { replace: true })
  const sizeChanged = parseSize(new URLSearchParams(arrivalSize), sizeNumber) !== factor

  // Back like the browser when an in-app entry lies behind (§3.4); otherwise to the recipe, replacing this entry so
  // Back doesn't return to cook mode. A size changed here must reach the detail (#210), and the entry behind still
  // has the old one, so then it goes forward to the recipe as well.
  const close = () => {
    if (hasAppHistory() && !sizeChanged) navigate(-1)
    else navigate(detailHref, { replace: true })
  }

  const goBack = () => {
    // Arriving at step 1 disables "Zurück"; focus on it would fall to the page, so it moves on to "Weiter".
    if (index === 1 && document.activeElement === backRef.current) primaryRef.current?.focus()
    setIndex((i) => Math.max(0, i - 1))
  }

  const panelOpen = timerPanel?.open ?? false
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Radix handles Escape for its open layers first and marks it handled: an open popover, sheet or tooltip
      // (hovered ✕) closes on the first Esc, cook mode on the next.
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || panelOpen || sheet.open) return
      if (isEditable(e.target)) return
      if (e.key === 'Escape') close()
      // No steps yet (loading, error): paging now would leave the index outside the list once they arrive.
      else if (stepCount === 0) return
      else if (e.key === 'ArrowLeft') goBack()
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(stepCount - 1, i + 1))
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const closeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriggerButton variant="ghost" size="icon" aria-label="Koch-Modus beenden" onClick={close} className="-ml-2">
          <X className="size-5" />
        </TriggerButton>
      </TooltipTrigger>
      <TooltipContent>Koch-Modus beenden</TooltipContent>
    </Tooltip>
  )

  if (status !== 'ready' || !recipe) {
    return (
      <CookFrame
        header={
          <CookHeader close={closeButton}>
            {status === 'loading' ? (
              <>
                <h1 className="sr-only">Kochen</h1>
                <Skeleton className="h-5 w-48 max-w-full" />
              </>
            ) : (
              <h1 className="truncate font-semibold">Kochen</h1>
            )}
          </CookHeader>
        }
      >
        {status === 'loading' ? (
          <StepSkeleton />
        ) : (
          <ErrorState
            title="Rezept konnte nicht geladen werden"
            description="Vielleicht wurde es gelöscht, oder der Server ist gerade nicht erreichbar."
            onRetry={reload}
            extraAction={
              // replace: Back must not return to a cook mode that has nothing to show.
              <Button asChild variant="outline" size="sm">
                <Link to={detailHref} replace>
                  Zum Rezept
                </Link>
              </Button>
            }
          />
        )}
      </CookFrame>
    )
  }

  const title = (
    <h1 className="truncate font-semibold">
      <TagText value={recipe.name} />
    </h1>
  )

  // Design spec: without steps the frame shows only ✕ and the title, no bar and no footer.
  if (stepCount === 0) {
    return (
      <CookFrame header={<CookHeader close={closeButton}>{title}</CookHeader>}>
        <EmptyState
          icon={ChefHat}
          title="Dieses Rezept hat noch keine Schritte."
          action={
            <>
              <Button asChild variant="outline" size="sm">
                <Link to={detailHref} replace>
                  Zum Rezept
                </Link>
              </Button>
              {canEdit(recipe, currentUserId) && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/recipes/${recipe.id}/edit`}>Bearbeiten</Link>
                </Button>
              )}
            </>
          }
        />
      </CookFrame>
    )
  }

  const step = steps[index]
  const next = nextStep(steps, index)
  const last = index === stepCount - 1
  const withIngredients = hasIngredients(recipe)
  const ingredientProps = { recipe, factor, onFactorChange: setFactor, checkedIds, onToggle: toggle }

  return (
    <CookFrame
      aside={
        wide && withIngredients ? (
          <CookIngredientsColumn {...ingredientProps} takeFocus={sheet.handOver} onFocusTaken={sheet.handedOver} />
        ) : undefined
      }
      header={
        <>
          <CookHeader
            close={closeButton}
            actions={
              <>
                {!wide && withIngredients && (
                  <CookIngredientsSheet open={sheet.open} onOpenChange={sheet.setOpen} {...ingredientProps} />
                )}
                {wakeLock.supported && (
                  <CompactToggle
                    pressed={wakeLock.enabled}
                    onClick={wakeLock.toggle}
                    label="Bildschirm anlassen"
                    tooltip={wakeLock.enabled ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}
                  >
                    <MugIcon steam={wakeLock.enabled} />
                  </CompactToggle>
                )}
              </>
            }
          >
            {title}
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {step.sectionName && (
                <>
                  <TagText value={step.sectionName} /> ·{' '}
                </>
              )}
              Schritt {step.number} von {stepCount}
            </p>
          </CookHeader>
          <div
            role="progressbar"
            aria-label="Fortschritt"
            aria-valuemin={1}
            aria-valuemax={stepCount}
            aria-valuenow={step.number}
          >
            {/* The colours reach into postxl's Progress through its data-testids: it takes no bar or track classes. */}
            <Progress
              value={step.number / stepCount}
              className="mt-0 h-[3px] rounded-none [&>[data-testid=progress-bg]]:bg-border [&>[data-testid=progress-filled]]:bg-foreground"
            />
          </div>
        </>
      }
      footer={
        <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background p-4 pr-[calc(1rem+env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))]">
          <TriggerButton
            ref={backRef}
            variant="outline"
            size="lg"
            className="h-12 phone:w-12 phone:px-0"
            disabled={index === 0}
            onClick={goBack}
          >
            <ChevronLeft aria-hidden />
            <span className="phone:sr-only">Zurück</span>
          </TriggerButton>
          <StepDots steps={steps} index={index} />
          {/* One button whose label changes, so keyboard focus stays on it when "Weiter" becomes "Fertig". */}
          <TriggerButton
            ref={primaryRef}
            size="lg"
            className="h-12"
            onClick={last ? close : () => setIndex((i) => Math.min(stepCount - 1, i + 1))}
          >
            {last ? (
              <>
                <Check aria-hidden />
                Fertig
              </>
            ) : (
              <>
                Weiter
                <ChevronRight aria-hidden />
              </>
            )}
          </TriggerButton>
        </footer>
      }
    >
      {/* Paging moves no focus, so the new step is announced as one plain string (the visible text would be read in
          fragments, chip labels included). */}
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="step-announcement">
        {`Schritt ${step.number} von ${stepCount}: ${plainTagText(step.text, tags)}`}
      </p>
      <h2 className="text-sm font-semibold text-muted-foreground tabular-nums">Schritt {step.number}</h2>
      {/* The step size has no token in the text scale; the time chips scale with it (variant "cook"). */}
      <p className="mt-2 mb-5 text-[30px] leading-[1.3] font-semibold tracking-[-0.02em] wrap-anywhere lg:text-[34px] phone:text-[26px]">
        <StepText value={step.text} timerLabel={`${plainName} · Schritt ${step.number}`} variant="cook" />
      </p>
      <CookNeed ingredients={recipe.sections[step.sectionIndex].ingredients} factor={factor} checkedIds={checkedIds} />
      {next && (
        <div className="mt-10 text-[15px]">
          <span className="block text-xs font-semibold text-muted-foreground">Danach</span>
          <span className="text-muted-foreground">
            {next.prefix && (
              <>
                <TagText value={next.prefix} /> ·{' '}
              </>
            )}
            <TagText value={next.text} />
          </span>
        </div>
      )}
    </CookFrame>
  )
}

function CookFrame({
  header,
  footer,
  aside,
  children,
}: {
  header: ReactNode
  footer?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  const main = (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-10 pt-[8vh] pb-10 lg:px-14 phone:px-5 phone:pt-7">
      {children}
    </main>
  )
  return (
    // With the ingredient column the frame fills the screen and column and step scroll on their own; the step's
    // scroller spans the full width, so the wheel works beside the centred 860 px too. Without it the page scrolls.
    <div className={cn('flex flex-col bg-background text-foreground', aside ? 'h-dvh' : 'min-h-dvh')}>
      <div className="sticky top-0 z-10 bg-background">{header}</div>
      {aside ? (
        <div className="flex min-h-0 flex-1">
          {aside}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{main}</div>
        </div>
      ) : (
        main
      )}
      {footer}
    </div>
  )
}

function CookHeader({ close, actions, children }: { close: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    // viewport-fit=cover (#220): header and footer keep their content clear of notch and home indicator.
    <header className="flex items-center gap-3 px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]">
      {close}
      <div className="min-w-0 flex-1">{children}</div>
      {actions}
      <TimerPanel />
    </header>
  )
}

function StepDots({ steps, index }: { steps: CookStep[]; index: number }) {
  if (steps.length > MAX_DOTS) {
    return (
      <span className="text-sm tabular-nums">
        {index + 1} / {steps.length}
      </span>
    )
  }
  // The header says "Schritt x von y" already; the dots are decoration.
  return (
    <div aria-hidden className="flex items-center gap-1.5" data-testid="step-dots">
      {steps.map((s, i) => (
        <span
          key={s.number}
          className={cn(
            'h-2 rounded-full',
            i === index ? 'w-[22px] rounded-sm bg-foreground' : 'w-2',
            i < index ? 'bg-muted-foreground' : i > index && 'bg-border',
          )}
        />
      ))}
    </div>
  )
}

function StepSkeleton() {
  return (
    <div role="status" data-testid="cook-skeleton">
      <span className="sr-only">Schritt wird geladen</span>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-9 w-full" />
      <Skeleton className="mt-2 h-9 w-4/5" />
      <Skeleton className="mt-10 h-4 w-1/2" />
    </div>
  )
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  // A ticked checkbox keeps focus; the arrow keys must still page then.
  if (target instanceof HTMLInputElement) return target.type !== 'checkbox'
  return target.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target.tagName)
}
