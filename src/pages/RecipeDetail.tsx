import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ChefHat, Clock, Copy, ListChecks, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { Skeleton } from '../components/Skeleton'
import { ErrorState } from '../components/StateCard'
import { foodly } from '../api'
import { errorMessage } from '../lib/errorMessage'
import { useRequest } from '../hooks/useRequest'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useWakeLock } from '../hooks/useWakeLock'
import { canEdit, isOwner } from '../editor/access'
import { useCurrentUserId, useRefreshCategories, useTags, useUsers } from '../catalog/CatalogProvider'
import { TagText } from '../components/TagText'
import { plainTagText } from '../components/tagTokens'
import { Rating } from '../components/recipe/Rating'
import { TagChips } from '../components/recipe/TagChips'
import { SectionBlock } from '../components/recipe/SectionBlock'
import { PortionScaler } from '../components/recipe/PortionScaler'
import { WakeLockToggle } from '../components/WakeLockToggle'
import { CompactToggle } from '../components/CompactToggle'
import { RecipeHero, RecipeImages } from '../components/recipe/RecipeImages'
import { DeleteRecipeDialog } from '../components/recipe/DeleteRecipeDialog'
import { HeaderActions, HeaderCrumbName } from '../components/shell/PageHeader'
import { Lightbox } from '../components/recipe/Lightbox'
import { TriggerButton } from '../components/TriggerButton'
import { Page } from '../components/shell/Page'
import { RecipeCategoryChips } from '../components/category/RecipeCategoryChips'
import type { Recipe, UserId } from '../api/protocol'
import { cookHref, parseSize, withSize } from '../cook/size'
import { formatRecipeTimes } from '../api/views'
import { openRecipe, useCheckedIngredients } from '../cook/checkedIngredients'
import { pushRecentlyViewed, removeRecentlyViewed } from '../home/recentlyViewed'
import { isNative } from '../native/platform'
import { openExternal } from '../native/openExternal'

// With a photo: image and infos side by side from 1100 px, stacked below (image max. 640 px wide).
const HEAD_GRID = 'grid items-start gap-5 min-[1100px]:grid-cols-2 min-[1100px]:gap-8'
const HERO_WIDTH = 'max-w-[640px] min-[1100px]:max-w-none'

// Lazy: they would otherwise push the entry chunk over its limit (vite.config.ts).
const MyNote = lazy(() => import('../components/recipe/MyNote').then((m) => ({ default: m.MyNote })))
const RecipeComments = lazy(() =>
  import('../components/recipe/RecipeComments').then((m) => ({ default: m.RecipeComments })),
)

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

export function RecipeDetail() {
  const { id } = useParams()
  const recipeId = Number(id)
  const { status, data: recipe, reload } = useRequest(() => foodly.getRecipe(recipeId), [recipeId])
  const currentUserId = useCurrentUserId()
  const { byId: tags } = useTags()

  const navigate = useNavigate()
  const refreshCategories = useRefreshCategories()
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const moreTrigger = useRef<HTMLButtonElement>(null)
  const openingDelete = useRef(false)
  // Bumped per clone attempt and on every recipe switch, so a late failure of an outdated clone is ignored.
  const cloneAttempt = useRef(0)

  const onClone = async () => {
    if (!recipe) return
    const attempt = ++cloneAttempt.current
    setCloning(true)
    setCloneError(null)
    try {
      const copy = await foodly.copyRecipe(recipe.id)
      refreshCategories() // the copy joins the original's categories
      void navigate(`/recipes/${copy.id}`)
    } catch (e) {
      if (attempt !== cloneAttempt.current) return
      setCloneError(errorMessage(e, 'Kopie erstellen fehlgeschlagen'))
      setCloning(false)
    }
  }

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // The recipe a rating write resolved to; only applies to the recipe it belongs to.
  const [ratedRecipe, setRatedRecipe] = useState<Recipe | null>(null)

  // Size and ticks are shared with the cook mode: the size lives in the URL (src/cook/size.ts), the ticks in a
  // memory store that only another recipe clears. /recipes/:id keeps this instance across ids, so the rating and
  // clone state are reset here.
  const [searchParams, setSearchParams] = useSearchParams()
  const { checkable, checkedIds, setCheckable, toggle: toggleChecked } = useCheckedIngredients(recipeId)
  // Owned here, not by the toggle: on phones the ⋯ menu item switches it, and that item unmounts with the menu.
  const {
    enabled: wakeEnabled,
    supported: wakeSupported,
    setEnabled: setWakeLock,
    toggle: toggleWakeLock,
  } = useWakeLock()
  const isDesktop = useIsDesktop()

  useEffect(() => {
    openRecipe(recipeId)
  }, [recipeId])

  useEffect(() => {
    setRatedRecipe(null)
    setCloning(false)
    setCloneError(null)
    cloneAttempt.current++
    // The lock used to end with the toggle's unmount on a recipe switch; keep it that way.
    setWakeLock(false)
  }, [recipeId, setWakeLock])

  // Keyed on the loaded id only, so portion or rating changes don't push again; a repeat push just moves it to
  // the front, so StrictMode's double run is harmless.
  const loadedId = status === 'ready' && recipe ? recipe.id : null
  useEffect(() => {
    if (loadedId !== null && currentUserId !== null) pushRecentlyViewed(currentUserId, loadedId)
  }, [loadedId, currentUserId])

  // Timer labels are plain text, so tag tokens in the name become the tag's name.
  const plainName = recipe ? plainTagText(recipe.name, tags) : ''
  // All images of the recipe in viewer order: main first, then the gallery. Empty → no hero, no gallery.
  const allImages = recipe ? (recipe.mainImage !== null ? [recipe.mainImage, ...recipe.images] : recipe.images) : []
  const sizeNumber = recipe?.sizeNumber ?? null
  const factor = parseSize(searchParams, sizeNumber)
  // replace: stepping the size must not pile up history entries.
  const setFactor = (next: number) => setSearchParams((p) => withSize(p, next, sizeNumber), { replace: true })

  const editable = recipe ? canEdit(recipe, currentUserId) : false
  const owner = recipe ? isOwner(recipe, currentUserId) : false
  const hasPhoto = allImages.length > 0
  const hasSteps = recipe ? recipe.sections.some((s) => s.steps.length > 0) : false

  return (
    <Page className="pb-10">
      {status === 'ready' && recipe && (
        <>
          <HeaderCrumbName name={plainName} />
          <HeaderActions>
            {/* On phones every action is an icon-only 40×40 tap target (design.md §7). Editors get the pencil
                there; viewers get "Kopie erstellen" in its place, their way to an editable version. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TriggerButton
                  variant="ghost"
                  size="icon"
                  aria-label="Kopie erstellen"
                  onClick={() => void onClone()}
                  disabled={cloning}
                  className={cn('phone:size-10', editable && 'phone:hidden')}
                >
                  <Copy className="h-4 w-4" />
                </TriggerButton>
              </TooltipTrigger>
              <TooltipContent>Kopie erstellen</TooltipContent>
            </Tooltip>
            {editable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A Link styled via buttonVariants, not <Button asChild>: the postxl Button would drop the
                      tooltip's ref. TriggerButton is a <button>, so it can't stand in for a link. */}
                  <Link
                    to={`/recipes/${recipe.id}/edit`}
                    state={{ fromDetail: true }}
                    aria-label="Bearbeiten"
                    className={cn(
                      // Ghost on phones like the other header icons (#301); desktop keeps the labelled outline.
                      buttonVariants({ variant: isDesktop ? 'outline' : 'ghost', size: 'sm' }),
                      'gap-1.5 phone:size-10',
                    )}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="phone:hidden">Bearbeiten</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Rezept bearbeiten</TooltipContent>
              </Tooltip>
            )}
            {/* Löschen isn't in the mockup's header: a lead decision keeps it reachable behind ⋯ (owner only). On
                phones ⋯ also takes the action row's two toggles (#301), so there everyone gets it. One element
                for both layouts, so an open menu survives a resize across the breakpoint. */}
            {(owner || !isDesktop) && (
              <DropdownMenu modal={false}>
                <Tooltip>
                  {/* Menu trigger outside: postxl's DropdownMenuTrigger doesn't forward refs, so it can't sit under
                      TooltipTrigger asChild. */}
                  <DropdownMenuTrigger asChild>
                    <TooltipTrigger asChild>
                      <TriggerButton
                        ref={moreTrigger}
                        variant="ghost"
                        size="icon"
                        aria-label="Weitere Aktionen"
                        className="phone:size-10"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </TriggerButton>
                    </TooltipTrigger>
                  </DropdownMenuTrigger>
                  <TooltipContent>Weitere Aktionen</TooltipContent>
                </Tooltip>
                {/* The dialog opened from the menu takes focus itself; only a plain close (Escape) returns it to ⋯. */}
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(e) => {
                    if (openingDelete.current) e.preventDefault()
                    openingDelete.current = false
                  }}
                >
                  {!isDesktop && (
                    <>
                      {/* preventDefault keeps the menu open, so the new check state shows right away. */}
                      <DropdownMenuCheckboxItem
                        checked={checkable}
                        onCheckedChange={setCheckable}
                        onSelect={(e) => e.preventDefault()}
                      >
                        Zutaten abhaken
                      </DropdownMenuCheckboxItem>
                      {wakeSupported && (
                        <DropdownMenuCheckboxItem
                          checked={wakeEnabled}
                          onCheckedChange={setWakeLock}
                          onSelect={(e) => e.preventDefault()}
                        >
                          Bildschirm anlassen
                        </DropdownMenuCheckboxItem>
                      )}
                      {owner && <DropdownMenuSeparator />}
                    </>
                  )}
                  {owner && (
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onSelect={() => {
                        openingDelete.current = true
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                      Löschen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </HeaderActions>
          {owner && (
            <DeleteRecipeDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onCloseAutoFocus={(e) => {
                e.preventDefault()
                moreTrigger.current?.focus()
              }}
              recipeId={recipe.id}
              name={plainName}
              // replace: Back must not lead to the deleted recipe's "not found" page.
              onDeleted={() => {
                // Otherwise six deleted recipes in front would keep "Zuletzt angesehen" empty for good (failed
                // loads are only forgotten when another one loaded).
                if (currentUserId !== null) removeRecentlyViewed(currentUserId, [recipe.id])
                refreshCategories()
                void navigate('/recipes', { replace: true })
              }}
            />
          )}
          {cloneError && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {cloneError}
            </p>
          )}
        </>
      )}

      {status === 'loading' && (
        <div data-testid="detail-skeleton" className={HEAD_GRID}>
          <Skeleton className={cn('aspect-[4/3] w-full rounded-lg', HERO_WIDTH)} />
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-5 h-8 w-3/4" />
          </div>
        </div>
      )}

      {/* REST errors carry no status, so "not found" and "server unreachable" look the same here: one neutral card,
          no raw backend message. */}
      {status === 'error' && (
        <>
          {/* The page keeps one h1 (the recipe name once loaded). */}
          <h1 className="sr-only">Rezept</h1>
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
        </>
      )}

      {status === 'ready' && recipe && (
        <article>
          <header className={hasPhoto ? HEAD_GRID : 'max-w-[720px]'}>
            {hasPhoto && (
              <RecipeHero
                image={allImages[0]}
                alt={recipe.name}
                onOpen={() => setLightboxIndex(0)}
                className={HERO_WIDTH}
              />
            )}
            <div>
              <RecipeCategoryChips key={recipe.id} recipe={recipe} />
              {/* 26 px matches the text-2xl token; the 32 px of the photo-less head, the 650 weight, line height and
                  tracking are spec values without a token. The arbitrary 32 px brings no line height, so without one a
                  two-line title overlapped itself (body's 20 px). */}
              <h1
                // Leading after the size: tailwind-merge drops a line height that precedes a font size.
                className={cn(
                  'mt-2.5 mb-2 font-[650] tracking-[-0.025em] text-foreground',
                  hasPhoto ? 'text-2xl' : 'text-[32px]',
                  'leading-[1.15]',
                )}
              >
                <TagText value={recipe.name} size="lg" />
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <Rating recipe={ratedRecipe?.id === recipe.id ? ratedRecipe : recipe} onChange={setRatedRecipe} />
                <RecipeTime recipe={recipe} />
                <RecipeOrigin recipe={recipe} me={currentUserId} />
              </div>

              {recipe.tags.length > 0 && (
                <div className="mt-3">
                  <TagChips tags={recipe.tags} />
                </div>
              )}

              {recipe.notes.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-[18px] text-base text-muted-foreground marker:text-subtle-foreground">
                  {recipe.notes.map((note, i) => (
                    <li key={i}>
                      <TagText value={note} />
                    </li>
                  ))}
                </ul>
              )}

              {/* One row on both layouts. A phone can't fit stepper, size text, both 40 px toggles and „Kochen“ in
                  358 px, so there the toggles live in the header's ⋯ menu instead (#301). */}
              <div className="mt-5 flex flex-wrap items-center gap-3 phone:flex-nowrap">
                <PortionScaler
                  factor={factor}
                  onChange={setFactor}
                  sizeNumber={recipe.sizeNumber}
                  sizeText={recipe.sizeText}
                />
                <div className="flex items-center gap-2 phone:hidden">
                  <CompactToggle
                    pressed={checkable}
                    onClick={() => setCheckable(!checkable)}
                    label="Zutaten abhaken"
                    tooltip="Zutaten beim Kochen abhaken"
                  >
                    <ListChecks className="size-4" />
                  </CompactToggle>
                  <WakeLockToggle enabled={wakeEnabled} supported={wakeSupported} toggle={toggleWakeLock} />
                </div>
                {hasSteps && (
                  <Link
                    to={cookHref(recipe.id, factor, recipe.sizeNumber)}
                    className={cn(buttonVariants(), 'ml-auto shrink-0 gap-1.5 phone:h-10')}
                  >
                    <ChefHat className="size-4" />
                    Kochen
                  </Link>
                )}
              </div>
            </div>
          </header>

          {recipe.sections.map((section, k) => (
            <SectionBlock
              key={section.id}
              section={section}
              showTitle={recipe.sections.length > 1}
              recipeName={plainName}
              stepOffset={recipe.sections.slice(0, k).reduce((n, s) => n + s.steps.length, 0)}
              factor={factor}
              checkable={checkable}
              checkedIds={checkedIds}
              onToggle={toggleChecked}
            />
          ))}

          {currentUserId !== null && (
            <Suspense fallback={null}>
              <MyNote key={recipe.id} recipeId={recipe.id} />
            </Suspense>
          )}

          <RecipeImages images={allImages} onOpen={setLightboxIndex} />

          {recipe.source && (
            <footer className="mt-7 text-sm text-muted-foreground">
              Quelle:{' '}
              {isUrl(recipe.source) ? (
                <a
                  href={recipe.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  onClick={
                    isNative()
                      ? (e) => {
                          e.preventDefault()
                          openExternal(e.currentTarget.href)
                        }
                      : undefined
                  }
                >
                  {recipe.source}
                </a>
              ) : (
                <TagText value={recipe.source} />
              )}
            </footer>
          )}

          {currentUserId !== null && (
            <Suspense fallback={null}>
              <RecipeComments key={recipe.id} recipe={recipe} />
            </Suspense>
          )}

          {lightboxIndex !== null && allImages.length > 0 && (
            <Lightbox
              images={allImages}
              index={lightboxIndex}
              onIndexChange={setLightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
        </article>
      )}
    </Page>
  )
}

// Minutes win over the legacy free-text `time`: the editor only maintains the minutes, so `time` is shown only for old
// data without them. The free text may wrap, the minutes stay on one line like in the list.
function RecipeTime({ recipe }: { recipe: Recipe }) {
  const minutes = formatRecipeTimes(recipe.workMinutes, recipe.overallMinutes)
  const text = minutes ? (
    <span className="whitespace-nowrap tabular-nums">{minutes}</span>
  ) : (
    recipe.time && <TagText value={recipe.time} />
  )
  if (!text) return null
  return (
    <span data-testid="recipe-time" className="inline-flex items-center gap-1.5">
      <Clock className="size-4 shrink-0" />
      {text}
    </span>
  )
}

// "von <owner>" on someone else's recipe, "mit <editors>" on my own shared one; nothing otherwise, and nothing
// until at least one name has loaded.
function RecipeOrigin({ recipe, me }: { recipe: Recipe; me: UserId | null }) {
  // Until I'm known (me still loading), my own recipe would read "von <me>", so nothing shows yet.
  const notMine = me !== null && recipe.owner !== me
  const ids = me === null ? [] : notMine ? [recipe.owner] : recipe.editors.filter((id) => id !== me)
  const users = useUsers(ids)
  if (users.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <Users className="size-4 shrink-0" />
      {`${notMine ? 'von' : 'mit'} ${users.map((u) => u.name).join(', ')}`}
    </span>
  )
}
