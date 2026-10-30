import { render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useIsDesktop } from './useIsDesktop'
import { setViewport } from '../test/viewport'

function Probe() {
  return <span>{useIsDesktop() ? 'desktop' : 'phone'}</span>
}

afterEach(() => setViewport(1024))

it('follows the 761 px breakpoint', () => {
  render(<Probe />)
  screen.getByText('desktop')
  setViewport(760)
  screen.getByText('phone')
  setViewport(761)
  screen.getByText('desktop')
})
