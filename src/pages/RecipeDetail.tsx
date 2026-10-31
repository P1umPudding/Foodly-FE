import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock, Copy, Info, ListChecks, Pencil } from 'lucide-react'
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
import { useRequest } from '../hooks/useRequest'
import { canEdit, isOwner } from '../editor/access'
import { useCurrentUserId, useTags } from '../catalog/CatalogProvider'
import { TagText } from '../components/TagText'
import { plainTagText } from '../components/tagTokens'
import { Rating } from '../components/recipe/Rating'
import { TagChips } from '../components/recipe/TagChips'
import { SectionBlock } from '../components/recipe/SectionBlock'
import { PortionScaler } from '../components/recipe/PortionScaler'
import { WakeLockToggle } from '../components/WakeLockToggle'
import { RecipeImages } from '../components/recipe/RecipeImages'
import { DeleteRecipeButton } from '../components/recipe/DeleteRecipeButton'
import { Lightbox } from '../components/recipe/Lightbox'
import { showsRecipeImages } from '../api/assets'
import type { Recipe, RecipeIngredientId } from '../api/protocol'

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
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)

  const onClone = async () => {
    if (!recipe) return
    setCloning(true)
    setCloneError(null)
    try {
      const copy = await foodly.copyRecipe(recipe.id)
      navigate(`/recipes/${copy.id}`)
    } catch (e) {
      setCloneError((e as Error).message)
      setCloning(false)
    }
  }

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // The recipe a rating write resolved to; only applies to the recipe it belongs to.
  const [ratedRecipe, setRatedRecipe] = useState<Recipe | null>(null)

  // Koch-Modus state is recipe-local and never persisted: switching recipes
  // clears the factor, the check-off mode and all ticks.
  const [factor, setFactor] = useState(1)
  const [checkable, setCheckable] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<RecipeIngredientId>>(new Set())

  useEffect(() => {
    setFactor(1)
    setCheckable(false)
    setCheckedIds(new Set())
    setRatedRecipe(null)
  }, [recipeId])

  const toggleChecked = (id: RecipeIngredientId) =>
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Timer labels are plain text, so tag tokens in the name become the tag's name.
  const plainName = recipe ? plainTagText(recipe.name, tags) : ''
  // All images of the recipe in viewer order: main first, then the gallery. Empty → no hero, no lightbox.
  const allImages =
    recipe && showsRecipeImages()
      ? recipe.mainImage !== null
        ? [recipe.mainImage, ...recipe.images]
        : recipe.images
      : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/recipes">← Zurück</Link>
        </Button>
        {status === 'ready' && recipe && (
          <div className="flex items-center gap-2">
            {cloneError && <span className="text-sm text-destructive">{cloneError}</span>}
            {isOwner(recipe, currentUserId) && (
              <DeleteRecipeButton
                recipeId={recipe.id}
                name={plainName}
                // replace: Back must not lead to the deleted recipe's "not found" page.
                onDeleted={() => navigate('/recipes', { replace: true })}
              />
            )}
            {/* On phones all three actions are icon-only 40×40 tap targets (design.md §7), labelled via
                tooltip. The triggers are styled via buttonVariants: postxl Button isn't forwardRef, so the
                tooltip couldn't anchor to it. */}
            <Tooltip>
              <TooltipTrigger
                aria-label="Duplizieren"
                onClick={onClone}
                disabled={cloning}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 max-[760px]:size-10')}
              >
                <Copy className="h-4 w-4" />
                <span className="max-[760px]:hidden">Duplizieren</span>
              </TooltipTrigger>
              <TooltipContent>Rezept duplizieren</TooltipContent>
            </Tooltip>
            {canEdit(recipe, currentUserId) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`/recipes/${recipe.id}/edit`}
                    aria-label="Bearbeiten"
                    className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 max-[760px]:size-10')}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="max-[760px]:hidden">Bearbeiten</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Rezept bearbeiten</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-40 w-full" />
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
          <header>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <h1 className="font-display text-4xl text-foreground">
                <TagText value={recipe.name} size="lg" />
              </h1>
              <TagChips tags={recipe.tags} hoverName size="lg" />
            </div>

            {/* Two rows, aligned as a grid so the size column stays put:
                row 1 is rating + time (left) and the size display (right),
                row 2 is the Koch-Modus tools (left) and the scaler's steppers
                (right, centred under the size box above). Portions-mode shows
                the editable count up top and its ± steppers below; multiplier
                -mode shows the size descriptor up top and the whole × scaler
                below. */}
            <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 text-xl">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <Rating recipe={ratedRecipe?.id === recipe.id ? ratedRecipe : recipe} onChange={setRatedRecipe} />
                </div>
                <div className="flex-1 text-center">
                  {recipe.time && (
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-5 w-5 shrink-0 text-foreground/75" />
                      <TagText value={recipe.time} size="md" />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                {recipe.sizeNumber !== null ? (
                  <PortionScaler
                    part="input"
                    factor={factor}
                    onChange={setFactor}
                    sizeNumber={recipe.sizeNumber}
                    sizeText={recipe.sizeText}
                  />
                ) : (
                  recipe.sizeText && <TagText value={recipe.sizeText} size="md" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={checkable}
                      onPressedChange={setCheckable}
                      aria-label="Zutaten abhaken"
                      size="sm"
                      className="gap-1.5 rounded-md text-muted-foreground data-[state=on]:text-primary"
                    >
                      <ListChecks className="size-5" />
                      <span className="text-lg">Abhaken</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>Zutaten abhaken</TooltipContent>
                </Tooltip>
                <WakeLockToggle />
              </div>
              <div
                className={cn(
                  'flex justify-center',
                  // Nudge up (via transform, so the row height — and Abhaken/
                  // Wachhalten with it — stays put) and slightly right of centre
                  // for a deliberately asymmetric look. The portions steppers go
                  // further on both axes; the multiplier scaler only a little. On phones the
                  // portions steppers' 40 px hit area would reach into the box above, so less.
                  recipe.sizeNumber !== null
                    ? '-translate-y-3 translate-x-2 max-[760px]:-translate-y-2'
                    : '-translate-y-1.5 translate-x-1',
                )}
              >
                <PortionScaler
                  part={recipe.sizeNumber !== null ? 'steppers' : 'full'}
                  factor={factor}
                  onChange={setFactor}
                  sizeNumber={recipe.sizeNumber}
                  sizeText={recipe.sizeText}
                />
              </div>
            </div>
          </header>

          <RecipeImages images={allImages} alt={recipe.name} onOpen={setLightboxIndex} />

          {recipe.notes.length > 0 && (
            <div className="mt-6 space-y-1.5">
              {recipe.notes.map((note, i) => (
                <p key={i} className="flex items-center gap-2 text-foreground/75">
                  <Info className="h-5 w-5 shrink-0" />
                  <span>
                    <TagText value={note} />
                  </span>
                </p>
              ))}
            </div>
          )}

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
