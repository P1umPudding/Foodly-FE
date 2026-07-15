import { Routes, Route, useParams } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@postxl/ui-components'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
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
      {/* TimerProvider wraps Nav + main so timers survive navigation. */}
      <TimerProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Nav />
          <main className="flex-1">
            <CatalogProvider>
              <Routes>
                <Route path="/" element={<RecipeList />} />
                {/* before /recipes/:id — otherwise "new" is parsed as an id */}
                <Route path="/recipes/new" element={<RecipeEditorRoute />} />
                <Route path="/recipes/:id" element={<RecipeDetail />} />
                <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CatalogProvider>
          </main>
          <Footer />
        </div>
        <Toaster />
      </TimerProvider>
    </TooltipProvider>
  )
}
