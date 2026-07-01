import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, Info, ListChecks } from 'lucide-react'
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
  cn,
} from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { averageRating } from '../api/views'
import { TagText } from '../components/TagText'
import { Rating } from '../components/recipe/Rating'
import { TagChips } from '../components/recipe/TagChips'
import { SectionBlock } from '../components/recipe/SectionBlock'
import { PortionScaler } from '../components/recipe/PortionScaler'
import { WakeLockToggle } from '../components/WakeLockToggle'
import { RecipeImages } from '../components/recipe/RecipeImages'
import { Lightbox } from '../components/recipe/Lightbox'
import type { RecipeIngredientId } from '../api/protocol'

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

export function RecipeDetail() {
  const { id } = useParams()
  const recipeId = Number(id)
  const { status, data: recipe, error } = useRequest(() => foodly.getRecipe(recipeId), [recipeId])

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Koch-Modus state is recipe-local and never persisted: switching recipes
  // clears the factor, the check-off mode and all ticks.
  const [factor, setFactor] = useState(1)
  const [checkable, setCheckable] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<RecipeIngredientId>>(new Set())

  useEffect(() => {
    setFactor(1)
    setCheckable(false)
    setCheckedIds(new Set())
  }, [recipeId])

  const toggleChecked = (id: RecipeIngredientId) =>
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // All images of the recipe in viewer order: main first, then the gallery.
  const hasMain = !!recipe && recipe.mainImage !== null
  const allImages = recipe ? (hasMain ? [recipe.mainImage as number, ...recipe.images] : recipe.images) : []

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/">← Zurück</Link>
      </Button>

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
              <Link to="/">Zur Liste</Link>
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
                <div className="shrink-0">{averageRating(recipe) !== null && <Rating recipe={recipe} />}</div>
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
                      className="gap-1.5 rounded-full text-muted-foreground data-[state=on]:text-primary"
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
                  // further on both axes; the multiplier scaler only a little.
                  recipe.sizeNumber !== null ? '-translate-y-3 translate-x-2' : '-translate-y-1.5 translate-x-1',
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

          {recipe.sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
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
