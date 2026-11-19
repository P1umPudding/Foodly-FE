import { screen, waitFor } from '@testing-library/react'

// Routes load their page lazily (#221). React.lazy keeps a loaded page per test file, so without this wait a test
// can pass only because an earlier one already loaded the page. The first import in a file can take over a second.
export async function lazyPageLoaded() {
  await waitFor(
    () => {
      if (screen.queryByTestId('route-fallback')) throw new Error('lazy route still loading')
    },
    { timeout: 3000 },
  )
}
