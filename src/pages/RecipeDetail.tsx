import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Badge, Button, Skeleton } from '@postxl/ui-components';
import { foodly } from '../api';
import { useRequest } from '../hooks/useRequest';
import { averageRating } from '../api/views';
import { TagText } from '../components/TagText';
import { Rating } from '../components/recipe/Rating';
import { SectionBlock } from '../components/recipe/SectionBlock';

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function RecipeDetail() {
  const { id } = useParams();
  const recipeId = Number(id);
  const { status, data: recipe, error } = useRequest(() => foodly.getRecipe(recipeId), [recipeId]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
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
          {/* mainImage hero goes here once image loading lands; null in Phase 1. */}
          <header>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="font-display text-3xl text-foreground"><TagText value={recipe.name} /></h1>
              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {recipe.tags.map((t) => <Badge key={t} variant="secondary"><TagText value={t} /></Badge>)}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {(() => {
                // Rating first, then time, then portions — only the present ones,
                // joined by "·" so there's never a stray leading separator.
                const parts: ReactNode[] = [];
                if (averageRating(recipe) !== null) parts.push(<Rating recipe={recipe} />);
                if (recipe.time) parts.push(<span>🕒 <TagText value={recipe.time} /></span>);
                if (recipe.amount) parts.push(<span><TagText value={recipe.amount} /></span>);
                return parts.map((node, i) => (
                  <Fragment key={i}>
                    {i > 0 && <span aria-hidden>·</span>}
                    {node}
                  </Fragment>
                ));
              })()}
            </div>
          </header>

          {recipe.notes.length > 0 && (
            <div className="mt-4 space-y-1">
              {recipe.notes.map((note, i) => (
                <p key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden>ⓘ</span><span><TagText value={note} /></span>
                </p>
              ))}
            </div>
          )}

          {recipe.sections.map((section) => <SectionBlock key={section.id} section={section} />)}

          {recipe.source && (
            <footer className="mt-10 text-sm text-muted-foreground">
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
