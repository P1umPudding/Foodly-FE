// Route tree for the guard and sign-in page tests: probe routes print where navigation ended up.
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { TooltipProvider } from '@postxl/ui-components'
import { RedirectIfSignedIn, RequireAuth, ShellLayout } from '../components/shell/RequireAuth'

export function LocationProbe({ label }: { label: string }) {
  const { pathname, search } = useLocation()
  return (
    <p data-testid="location">
      {label} {pathname + search}
    </p>
  )
}

type Entry = string | { pathname: string; search?: string; state?: unknown }

export function renderAuthRoutes(path: Entry, pages: { login?: ReactNode; register?: ReactNode } = {}) {
  return render(
    <TooltipProvider>
      <MemoryRouter useTransitions={false} initialEntries={[path]}>
        <Routes>
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/login" element={pages.login ?? <LocationProbe label="login" />} />
            <Route path="/register" element={pages.register ?? <LocationProbe label="register" />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<ShellLayout />}>
              <Route path="*" element={<LocationProbe label="app" />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  )
}
