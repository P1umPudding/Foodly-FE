import { Button } from '@postxl/ui-components'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import type { SaveStatus } from '../../editor/useAutosave'

const time = (at: number) => new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

export function SaveStatusIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status.state === 'error') {
    return (
      <span className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        Nicht gespeichert
        <Button variant="outline" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      </span>
    )
  }
  if (status.state === 'saving') {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Speichert …
      </span>
    )
  }
  if (status.state === 'saved' && status.at !== null) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Check className="h-4 w-4 text-success" />
        Automatisch gesichert {time(status.at)}
      </span>
    )
  }
  return <span className="text-muted-foreground">Änderungen werden automatisch gesichert</span>
}
