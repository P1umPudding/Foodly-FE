import { Routes, Route, useParams } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RedirectIfSignedIn, RequireAuth } from './components/shell/RequireAuth'
import { RootRedirect } from './components/shell/RootRedirect'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
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
      {/* The timers, the catalog and the shell live inside RequireAuth: timers belong to the signed-in user,
          and the sidebar and profile menu need the categories and `me`, which need a session. */}
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/recipes" element={<RecipeList />} />
          {/* before /recipes/:id — otherwise "new" is parsed as an id */}
          <Route path="/recipes/new" element={<RecipeEditorRoute />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </TooltipProvider>
  )
}
