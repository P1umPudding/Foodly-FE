import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChefHat, Clock, Copy, ListChecks, Pencil, Users } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Skeleton,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { foodly } from '../api'
import { errorMessage } from '../lib/errorMessage'
import { useRequest } from '../hooks/useRequest'
import { useHasAppHistory } from '../hooks/useHasAppHistory'
import { canEdit, isOwner } from '../editor/access'
import { useCurrentUserId, useRefreshCategories, useTags, useUser } from '../catalog/CatalogProvider'
import { TagText } from '../components/TagText'
import { plainTagText } from '../components/tagTokens'
import { Rating } from '../components/recipe/Rating'
import { TagChips } from '../components/recipe/TagChips'
import { SectionBlock } from '../components/recipe/SectionBlock'
import { PortionScaler } from '../components/recipe/PortionScaler'
import { WakeLockToggle } from '../components/WakeLockToggle'
import { RecipeHero, RecipeImages } from '../components/recipe/RecipeImages'
import { DeleteRecipeButton } from '../components/recipe/DeleteRecipeButton'
import { Lightbox } from '../components/recipe/Lightbox'
import { TriggerButton } from '../components/TriggerButton'
import { RecipeCategoryChips } from '../components/category/RecipeCategoryChips'
import type { Recipe, UserId } from '../api/protocol'
import { cookHref, parseSize, withSize } from '../cook/size'
import { openRecipe, useCheckedIngredients } from '../cook/checkedIngredients'
import { pushRecentlyViewed, removeRecentlyViewed } from '../home/recentlyViewed'

// With a photo: image and infos side by side from 1100 px, stacked below (image max. 640 px wide).
const HEAD_GRID = 'grid items-start gap-5 min-[1100px]:grid-cols-2 min-[1100px]:gap-8'
const HERO_WIDTH = 'max-w-[640px] min-[1100px]:max-w-none'

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

export function RecipeDetail() {
  const { id } = useParams()
  const recipeId = Number(id)
  const { status, data: recipe, error } = useRequest(() => foodly.getRecipe(recipeId), [recipeId])
  const currentUserId = useCurrentUserId()
  const { byId: tags } = useTags()

  const navigate = useNavigate()
  const refreshCategories = useRefreshCategories()
  const hasAppHistory = useHasAppHistory()
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
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
      navigate(`/recipes/${copy.id}`)
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

  useEffect(() => {
    openRecipe(recipeId)
  }, [recipeId])

  useEffect(() => {
    setRatedRecipe(null)
    setCloning(false)
    setCloneError(null)
    cloneAttempt.current++
  }, [recipeId])

  // Keyed on the loaded id only, so portion or rating changes don't push again; a repeat push just moves it to
  // the front, so StrictMode's double run is harmless.
  const loadedId = status === 'ready' && recipe ? recipe.id : null
  useEffect(() => {
    if (loadedId !== null && currentUserId !== null) pushRecentlyViewed(currentUserId, loadedId)
  }, [loadedId, currentUserId])

  // Came from inside the app: go back like the browser does, so the list keeps its search, filters and scroll
  // and no extra history entry piles up. Otherwise (direct link) the plain link to /recipes applies.
  const onBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!hasAppHistory()) return
    e.preventDefault()
    navigate(-1)
  }

  // Timer labels are plain text, so tag tokens in the name become the tag's name.
  const plainName = recipe ? plainTagText(recipe.name, tags) : ''
  // All images of the recipe in viewer order: main first, then the gallery. Empty → no hero, no gallery.
  const allImages = recipe ? (recipe.mainImage !== null ? [recipe.mainImage, ...recipe.images] : recipe.images) : []
  const sizeNumber = recipe?.sizeNumber ?? null
  const factor = parseSize(searchParams, sizeNumber)
  // replace: stepping the size must not pile up history entries.
  const setFactor = (next: number) => setSearchParams((p) => withSize(p, next, sizeNumber), { replace: true })

  const editable = recipe ? canEdit(recipe, currentUserId) : false
  const hasPhoto = allImages.length > 0
  const hasSteps = recipe ? recipe.sections.some((s) => s.steps.length > 0) : false

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/recipes" onClick={onBack}>
            ← Zurück
          </Link>
        </Button>
        {status === 'ready' && recipe && (
          <div className="flex items-center gap-2">
            {cloneError && <span className="text-sm text-destructive">{cloneError}</span>}
            {isOwner(recipe, currentUserId) && (
              <DeleteRecipeButton
                recipeId={recipe.id}
                name={plainName}
                // replace: Back must not lead to the deleted recipe's "not found" page.
                onDeleted={() => {
                  // Otherwise six deleted recipes in front would keep "Zuletzt angesehen" empty for good (failed
                  // loads are only forgotten when another one loaded).
                  if (currentUserId !== null) removeRecentlyViewed(currentUserId, [recipe.id])
                  refreshCategories()
                  navigate('/recipes', { replace: true })
                }}
              />
            )}
            {/* On phones every action is an icon-only 40×40 tap target (design.md §7). Editors get only the
                pencil there; viewers get "Kopie erstellen" in its place, their way to an editable version. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <TriggerButton
                  variant="outline"
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
                    className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 phone:size-10')}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="phone:hidden">Bearbeiten</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Rezept bearbeiten</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

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

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Rezept nicht gefunden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button asChild variant="outline" size="sm">
              <Link to="/recipes">Zur Liste</Link>
            </Button>
          </AlertDescription>
        </Alert>
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
              {/* 26 px matches the text-2xl token; the 32 px of the photo-less head and the 650 weight are spec
                  values without a token. */}
              <h1 className={cn('font-[650] text-foreground', hasPhoto ? 'text-2xl' : 'text-[32px]')}>
                <TagText value={recipe.name} size="lg" />
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <Rating recipe={ratedRecipe?.id === recipe.id ? ratedRecipe : recipe} onChange={setRatedRecipe} />
                {recipe.time && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4 shrink-0" />
                    <TagText value={recipe.time} />
                  </span>
                )}
                <RecipeOrigin recipe={recipe} me={currentUserId} />
              </div>

              {recipe.tags.length > 0 && (
                <div className="mt-3">
                  <TagChips tags={recipe.tags} hoverName />
                </div>
              )}

              {recipe.notes.length > 0 && (
                <ul className="mt-4 space-y-1 text-base text-muted-foreground">
                  {recipe.notes.map((note, i) => (
                    <li key={i}>
                      <TagText value={note} />
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <PortionScaler
                  factor={factor}
                  onChange={setFactor}
                  sizeNumber={recipe.sizeNumber}
                  sizeText={recipe.sizeText}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={checkable}
                      onPressedChange={setCheckable}
                      aria-label="Zutaten abhaken"
                      size="sm"
                      className="gap-1.5 rounded-md text-muted-foreground data-[state=on]:text-primary phone:h-10"
                    >
                      <ListChecks className="size-5" />
                      <span>Abhaken</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>Zutaten abhaken</TooltipContent>
                </Tooltip>
                <WakeLockToggle />
                {hasSteps && (
                  <Link
                    to={cookHref(recipe.id, factor, recipe.sizeNumber)}
                    className={cn(buttonVariants(), 'ml-auto gap-1.5 phone:h-10')}
                  >
                    <ChefHat className="size-4" />
                    Kochen
                  </Link>
                )}
              </div>
            </div>
          </header>

          <RecipeImages images={allImages.slice(1)} onOpen={(i) => setLightboxIndex(i + 1)} />

          {recipe.sections.map((section, k) => (
            <SectionBlock
              key={section.id}
              section={section}
              recipeName={plainName}
              stepOffset={recipe.sections.slice(0, k).reduce((n, s) => n + s.steps.length, 0)}
              factor={factor}
              checkable={checkable}
              checkedIds={checkedIds}
              onToggle={toggleChecked}
            />
          ))}

          {recipe.source && (
            <footer className="mt-16 text-[0.95rem] text-foreground/75">
              Quelle:{' '}
              {isUrl(recipe.source) ? (
                <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="underline">
                  {recipe.source}
                </a>
              ) : (
                <TagText value={recipe.source} />
              )}
            </footer>
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
    </div>
  )
}

// "von <owner>" on someone else's recipe, "mit <editors>" on my own shared one; nothing otherwise.
function RecipeOrigin({ recipe, me }: { recipe: Recipe; me: UserId | null }) {
  const notMine = me === null || recipe.owner !== me
  const ids = notMine ? [recipe.owner] : recipe.editors.filter((id) => id !== me)
  if (ids.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <Users className="size-4 shrink-0" />
      {notMine ? 'von' : 'mit'}{' '}
      {/* Names still loading render nothing, so the separator only sits between shown names. */}
      <span className="[&>span+span]:before:content-[',_']">
        {ids.map((id) => (
          <UserName key={id} id={id} />
        ))}
      </span>
    </span>
  )
}

function UserName({ id }: { id: UserId }) {
  const user = useUser(id)
  return user ? <span>{user.name}</span> : null
}
