import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { useWakeLock } from '../hooks/useWakeLock'

const ICON = 'size-5'

function MugIcon({ steam }: { steam: boolean }) {
  return (
    <svg
      className={ICON}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {steam && <path d="M8 2c0 1-1 1.5-1 2.5S8 6 8 7M12 2c0 1-1 1.5-1 2.5S12 6 12 7M16 2c0 1-1 1.5-1 2.5S16 6 16 7" />}
      <path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
    </svg>
  )
}

// Lives in the recipe detail control row (Koch-Modus); icon-only, label via tooltip.
export function WakeLockToggle() {
  const { enabled, supported, toggle } = useWakeLock()
  if (!supported) return null

  return (
    <Tooltip>
      {/* span wrapper: postxl Button isn't forwardRef, so the tooltip can only
          anchor to a host element — without it the tooltip never shows. */}
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggle}
            aria-pressed={enabled}
            aria-label={enabled ? 'Bildschirm anlassen: an' : 'Bildschirm anlassen: aus'}
            className={cn(
              'gap-1.5 rounded-full transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
              enabled ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MugIcon steam={enabled} />
            <span className="text-lg">Wachhalten</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{enabled ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}</TooltipContent>
    </Tooltip>
  )
}
