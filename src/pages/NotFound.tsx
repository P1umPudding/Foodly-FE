import { Link } from 'react-router-dom'
import { Button } from '@postxl/ui-components'

export function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">404</p>
      <h1 className="font-display mt-4 text-4xl text-foreground">Seite nicht gefunden</h1>
      <p className="mt-3 text-muted-foreground">Diese Route gibt es nicht.</p>
      <Button asChild className="mt-8">
        <Link to="/">Zur Startseite</Link>
      </Button>
    </div>
  )
}
