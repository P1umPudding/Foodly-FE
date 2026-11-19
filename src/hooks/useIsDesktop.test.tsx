import { render, screen } from '@testing-library/react'
import { afterEach, it } from 'vitest'
import { useIsDesktop, useIsWideDesktop } from './useIsDesktop'
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

function WideProbe() {
  return <span>{useIsWideDesktop() ? 'wide' : 'narrow'}</span>
}

it('follows the 1024 px sidebar breakpoint', () => {
  render(<WideProbe />)
  screen.getByText('wide')
  setViewport(1023)
  screen.getByText('narrow')
  setViewport(1024)
  screen.getByText('wide')
})
