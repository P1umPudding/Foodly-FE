import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@postxl/ui-components'
import { foodly } from '../api'
import { useRequest } from '../hooks/useRequest'
import { RecipeRow } from '../components/recipe/RecipeRow'

export function RecipeList() {
  // Retry by bumping a nonce in the deps → useRequest re-runs (no full reload).
  const [nonce, setNonce] = useState(0)
  const { status, data, error } = useRequest(() => foodly.listRecipes(), [nonce])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display mb-6 text-3xl text-foreground">Rezepte</h1>

      {status === 'loading' && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Konnte Rezepte nicht laden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error?.message}</span>
            <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
              Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === 'ready' && data && data.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">Noch keine Rezepte.</p>
      )}

      {status === 'ready' && data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
