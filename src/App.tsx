import { Routes, Route, useParams } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { AppShell } from './components/shell/AppShell'
import { RootRedirect } from './components/shell/RootRedirect'
import { NotFound } from './pages/NotFound'
import { CatalogProvider } from './catalog/CatalogProvider'
import { TimerProvider } from './timers/TimerProvider'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { RecipeEditor } from './pages/RecipeEditor'

export function RecipeEditorRoute() {
  const { id } = useParams()
  // RecipeEditor seeds recipeId/draft from useState once, and React Router reuses
  // the same fiber across these sibling routes — so without a key, navigating
  // new<->edit (or between two ids) would keep stale state and autosave against
  // the wrong recipe. Key on route identity to force a clean remount.
  return <RecipeEditor key={id ?? 'new'} />
}

export default function App() {
  return (
    <TooltipProvider>
      {/* TimerProvider wraps the shell so timers survive navigation; the catalog sits above the shell
          because the sidebar and profile menu need the categories and `me`. */}
      <TimerProvider>
        <CatalogProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/recipes" element={<RecipeList />} />
              {/* before /recipes/:id — otherwise "new" is parsed as an id */}
              <Route path="/recipes/new" element={<RecipeEditorRoute />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        </CatalogProvider>
      </TimerProvider>
    </TooltipProvider>
  )
}
