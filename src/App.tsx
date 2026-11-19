import { Routes, Route, useParams } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RedirectIfSignedIn, RequireAuth, ShellLayout } from './components/shell/RequireAuth'
import { BareLayout } from './components/shell/BareLayout'
import { NotFound } from './pages/NotFound'
import { RootRoute } from './pages/RootRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { RecipeEditor } from './pages/RecipeEditor'
import { Categories } from './pages/Categories'
import { CategoryPage } from './pages/CategoryPage'
import { Profile } from './pages/Profile'
import { CookMode } from './pages/CookMode'

export function RecipeEditorRoute() {
  const { id } = useParams()
  // RecipeEditor seeds recipeId/draft from useState once, and React Router reuses
  // the same fiber across these sibling routes — so without a key, navigating
  // new<->edit (or between two ids) would keep stale state and autosave against
  // the wrong recipe. Key on route identity to force a clean remount.
  return <RecipeEditor key={id ?? 'new'} />
}

// Keyed like the editor: another recipe starts at step 1.
function CookModeRoute() {
  const { id } = useParams()
  return <CookMode key={id} />
}

// Keyed like the editor: another category starts with a fresh page (dialog, scroll).
function CategoryPageRoute() {
  const { id } = useParams()
  return <CategoryPage key={id} />
}

export default function App() {
  return (
    <TooltipProvider>
      {/* The timers, the catalog and the toasts live inside RequireAuth: timers belong to the signed-in user, and the
          sidebar and profile page need the categories and `me`, which need a session. Below it each route picks its
          frame; both frames share those providers, so timers and toasts survive the way into cook mode. */}
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<ShellLayout />}>
            <Route path="/" element={<RootRoute />} />
            <Route path="/recipes" element={<RecipeList />} />
            {/* before /recipes/:id — otherwise "new" is parsed as an id */}
            <Route path="/recipes/new" element={<RecipeEditorRoute />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEditorRoute />} />
            {/* static segment: stays before /categories/:id */}
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/:id" element={<CategoryPageRoute />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<BareLayout />}>
            <Route path="/recipes/:id/cook" element={<CookModeRoute />} />
          </Route>
        </Route>
      </Routes>
    </TooltipProvider>
  )
}
