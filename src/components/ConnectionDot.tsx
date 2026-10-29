import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { useSocketStatus } from '../hooks/useSocketStatus'

const LABEL: Record<string, string> = {
  open: 'Verbunden',
  connecting: 'Verbinde …',
  closed: 'Getrennt',
}
const DOT: Record<string, string> = {
  open: 'bg-success',
  connecting: 'bg-warning',
  closed: 'bg-destructive',
}

/**
 * Socket state indicator, meant for the future live editing. The socket is open once
 * the mock responder is installed (normally right at boot), so the dot says nothing
 * about REST/backend health.
 */
export function ConnectionDot() {
  const status = useSocketStatus()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${DOT[status]}`} />
          <span className="hidden sm:inline">{LABEL[status]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>Backend: {LABEL[status]}</TooltipContent>
    </Tooltip>
  )
}
