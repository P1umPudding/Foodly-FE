// An icon-only on/off button with a tooltip, as in the detail action row (Abhaken, Wachhalten): outlined like the
// size stepper's buttons. The on-state keys on aria-pressed, not Radix' data-state: under TooltipTrigger asChild
// the tooltip's data-state would win. Its dark border tells "on" apart from a hovered "off".
import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@postxl/ui-components'
import { TriggerButton } from './TriggerButton'

export function CompactToggle({
  pressed,
  onClick,
  label,
  tooltip,
  children,
}: {
  pressed: boolean
  onClick: () => void
  label: string
  tooltip: ReactNode
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <TriggerButton
          variant="outline"
          size="iconSm"
          onClick={onClick}
          aria-pressed={pressed}
          aria-label={label}
          className="bg-card text-muted-foreground hover:text-foreground phone:size-10 dark:bg-card aria-pressed:border-foreground aria-pressed:bg-accent aria-pressed:text-foreground aria-pressed:hover:bg-accent"
        >
          {children}
        </TriggerButton>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
