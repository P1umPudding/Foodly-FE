import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Page } from './Page'

describe('Page', () => {
  it('is centred and at most 1080 px wide (#228)', () => {
    render(<Page data-testid="page">x</Page>)
    const classes = screen.getByTestId('page').className.split(' ')
    expect(classes).toEqual(expect.arrayContaining(['mx-auto', 'max-w-[1080px]', 'px-8', 'pt-6']))
  })

  it('is 1280 px wide for the recipe list', () => {
    render(
      <Page wide data-testid="page">
        x
      </Page>,
    )
    const classes = screen.getByTestId('page').className.split(' ')
    expect(classes).toContain('max-w-[1280px]')
    expect(classes).not.toContain('max-w-[1080px]')
  })
})
