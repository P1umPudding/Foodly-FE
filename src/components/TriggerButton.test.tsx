import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  cn,
} from '@postxl/ui-components'
import { describe, expect, it } from 'vitest'
import { TriggerButton } from './TriggerButton'

const classes = (el: HTMLElement) => el.className.split(/\s+/)

describe('TriggerButton', () => {
  it('forwards its ref to a native button that does not submit forms', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<TriggerButton ref={ref}>Los</TriggerButton>)
    const button = screen.getByRole('button', { name: 'Los' })
    expect(ref.current).toBe(button)
    expect(button.getAttribute('type')).toBe('button')
  })

  it('is styled like the postxl Button, with its 3 px focus ring', () => {
    render(
      <TriggerButton variant="outline" size="sm">
        Los
      </TriggerButton>,
    )
    const button = screen.getByRole('button')
    expect(button.className).toBe(cn(buttonVariants({ variant: 'outline', size: 'sm' })))
    expect(classes(button)).toEqual(expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:ring-ring/50']))
  })

  it('bare: only the focus ring, no button styling; size is ignored and the caller className wins', () => {
    render(
      <TriggerButton variant="bare" size="sm" className="rounded-md focus-visible:ring-ring">
        Los
      </TriggerButton>,
    )
    const c = classes(screen.getByRole('button'))
    expect(c).toEqual(
      expect.arrayContaining(['focus-visible:ring-[3px]', 'focus-visible:outline-hidden', 'rounded-md']),
    )
    expect(c).toContain('focus-visible:ring-ring')
    expect(c).not.toContain('inline-flex')
    expect(c).not.toContain('h-8')
  })

  it('anchors a tooltip as TooltipTrigger asChild', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <TriggerButton aria-label="Info" />
          </TooltipTrigger>
          <TooltipContent>Mehr erfahren</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    )
    fireEvent.focus(screen.getByRole('button', { name: 'Info' }))
    expect((await screen.findByRole('tooltip')).textContent).toContain('Mehr erfahren')
  })

  it('opens a popover as PopoverTrigger asChild and carries its state', async () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <TriggerButton>Öffnen</TriggerButton>
        </PopoverTrigger>
        <PopoverContent>Inhalt</PopoverContent>
      </Popover>,
    )
    const button = screen.getByRole('button', { name: 'Öffnen' })
    fireEvent.click(button)
    await screen.findByText('Inhalt')
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })
})
