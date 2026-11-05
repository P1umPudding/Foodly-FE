import { render, screen } from '@testing-library/react'
import { ToggleGroup } from '@postxl/ui-components'
import { FocusToggleGroupItem } from './FocusToggleGroupItem'

it('replaces postxl ring-1 with the 3-px focus ring and keeps the caller className', () => {
  render(
    <ToggleGroup type="single">
      <FocusToggleGroupItem value="a" aria-label="A" className="px-2.5" />
    </ToggleGroup>,
  )
  const classes = screen.getByRole('radio', { name: 'A' }).className.split(/\s+/)
  expect(classes).toContain('focus-visible:ring-[3px]')
  expect(classes).not.toContain('focus-visible:ring-1')
  expect(classes).toContain('focus-visible:ring-ring')
  expect(classes).toContain('px-2.5')
})
