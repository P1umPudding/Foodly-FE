import { Link, useParams } from 'react-router-dom';
import { Clock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { averageRating } from '../api/views';
import { recipeImageSrc } from '../api/assets';
import { TagText } from '../components/TagText';
import { Rating } from '../components/recipe/Rating';
import { TagChips } from '../components/recipe/TagChips';
import { SectionBlock } from '../components/recipe/SectionBlock';

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function RecipeDetail() {
  const { id } = useParams();
  const recipeId = Number(id);
  const { status, data: recipe, error } = useRequest(() => foodly.getRecipe(recipeId), [recipeId]);

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
            <Button asChild variant="outline" size="sm"><Link to="/">Zur Liste</Link></Button>
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

            {/* Rating natural-width left, portions natural-width right, time
                centred in the remaining space between them. */}
            <div className="mt-1 flex items-center gap-4 text-xl">
              <div className="shrink-0">
                {averageRating(recipe) !== null && <Rating recipe={recipe} />}
              </div>
              <div className="flex-1 text-center">
                {recipe.time && (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <TagText value={recipe.time} size="md" />
                  </span>
                )}
              </div>
              <div className="shrink-0">
                {recipe.amount && <TagText value={recipe.amount} size="md" />}
              </div>
            </div>
          </header>

          {recipe.mainImage !== null && (
            <img
              src={recipeImageSrc(recipe.mainImage)}
              alt={recipe.name}
              className="mt-6 max-h-80 w-full rounded-xl object-cover"
            />
          )}

          {recipe.notes.length > 0 && (
            <div className="mt-6 space-y-1.5">
              {recipe.notes.map((note, i) => (
                <p key={i} className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-5 w-5 shrink-0" />
                  <span><TagText value={note} /></span>
                </p>
              ))}
            </div>
          )}

          {recipe.sections.map((section) => <SectionBlock key={section.id} section={section} />)}

          {recipe.source && (
            <footer className="mt-16 text-[0.95rem] text-muted-foreground">
              Quelle:{' '}
              {isUrl(recipe.source)
                ? <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="underline">{recipe.source}</a>
                : <TagText value={recipe.source} />}
            </footer>
          )}
        </article>
      )}
    </div>
  );
}
