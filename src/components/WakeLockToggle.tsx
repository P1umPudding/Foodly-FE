import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@postxl/ui-components'
import { TriggerButton } from './TriggerButton'
import { useWakeLock } from '../hooks/useWakeLock'

const ICON = 'size-4'

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

// The look of the icon-only on/off buttons in the detail action row (Abhaken, Wachhalten): outlined like the
// size stepper's buttons. The on-state keys on aria-pressed, not Radix' data-state: under TooltipTrigger asChild
// the tooltip's data-state would win. Its dark border tells "on" apart from a hovered "off".
export const COMPACT_TOGGLE = cn(
  'bg-card text-muted-foreground hover:text-foreground phone:size-10 dark:bg-card',
  'aria-pressed:border-foreground aria-pressed:bg-accent aria-pressed:text-foreground aria-pressed:hover:bg-accent',
)

// Lives in the recipe detail action row, next to „Abhaken“.
export function WakeLockToggle() {
  const { enabled, supported, toggle } = useWakeLock()
  if (!supported) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriggerButton
          variant="outline"
          size="iconSm"
          onClick={toggle}
          aria-pressed={enabled}
          aria-label="Bildschirm anlassen"
          className={COMPACT_TOGGLE}
        >
          <MugIcon steam={enabled} />
        </TriggerButton>
      </TooltipTrigger>
      <TooltipContent>{enabled ? 'Bildschirm bleibt an' : 'Bildschirm anlassen'}</TooltipContent>
    </Tooltip>
  )
}
