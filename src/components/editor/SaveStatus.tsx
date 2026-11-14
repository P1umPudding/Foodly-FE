import { Button } from '@postxl/ui-components'
import { AlertTriangle, CircleCheck, Loader2, RotateCw } from 'lucide-react'
import type { SaveStatus } from '../../editor/useAutosave'

// Sits in the shell header next to "Fertig" (mockup `.saved`). On the phone only the icon shows; the text stays for
// screen readers, and the retry stays reachable as an icon button.
export function SaveStatusIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status.state === 'error') {
    return (
      // role="alert": a failed save (e.g. after "Fertig") must reach screen readers too.
      <span role="alert" className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="phone:sr-only">Nicht gespeichert</span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Erneut versuchen"
          onClick={onRetry}
          className="touch:h-10 phone:size-10 phone:px-0"
        >
          <RotateCw className="hidden size-4 phone:inline" />
          <span className="phone:hidden">Erneut versuchen</span>
        </Button>
      </span>
    )
  }
  if (status.state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        <span className="phone:sr-only">Speichert …</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <CircleCheck className="size-4 shrink-0" />
      <span className="phone:sr-only">Gespeichert</span>
    </span>
  )
}
