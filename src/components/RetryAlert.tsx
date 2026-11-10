import { Alert, AlertDescription, AlertTitle, Button } from '@postxl/ui-components'

// A failed load the user can retry in place (design.md §5 Zustände).
export function RetryAlert({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string | undefined
  onRetry: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      </AlertDescription>
    </Alert>
  )
}
