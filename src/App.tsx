import { lazy } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import { TooltipProvider } from '@postxl/ui-components'
import { RedirectIfSignedIn, RequireAuth, ShellLayout } from './components/shell/RequireAuth'
import { BareLayout } from './components/shell/BareLayout'
import { Page } from './components/shell/Page'
import { LazyRoute } from './components/RouteErrorBoundary'
import { AuthCardSkeleton } from './components/auth/AuthCard'
import { CategoryPageSkeleton } from './components/category/CategoryPageSkeleton'
import { CategoriesSkeleton } from './components/category/CategoryRowsSkeleton'
import { CookSkeleton } from './components/CookSkeleton'
import { EditorSkeleton } from './components/editor/EditorSkeleton'
import { SAFE_BOTTOM } from './components/editor/layout'
import { NotFound } from './pages/NotFound'
import { RootRoute } from './pages/RootRoute'
import { RecipeList } from './pages/RecipeList'
import { RecipeDetail } from './pages/RecipeDetail'
import { Profile } from './pages/Profile'

// Start, list and detail are the usual first pages and stay in the entry chunk; the rarer pages load on demand
// (#221). The pages are named exports, React.lazy wants a default one.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const RecipeEditor = lazy(() => import('./pages/RecipeEditor').then((m) => ({ default: m.RecipeEditor })))
const Categories = lazy(() => import('./pages/Categories').then((m) => ({ default: m.Categories })))
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })))
const CookMode = lazy(() => import('./pages/CookMode').then((m) => ({ default: m.CookMode })))

const HOME = { to: '/', label: 'Zur Startseite' }

export function RecipeEditorRoute() {
  const { id } = useParams()
  // RecipeEditor seeds recipeId/draft from useState once, and React Router reuses
  // the same fiber across these sibling routes — so without a key, navigating
  // new<->edit (or between two ids) would keep stale state and autosave against
  // the wrong recipe. Key on route identity to force a clean remount.
  return (
    <LazyRoute
      title={id ? 'Rezept bearbeiten' : 'Neues Rezept'}
      exit={HOME}
      fallback={
        <Page className={`pb-10 ${SAFE_BOTTOM}`}>
          <EditorSkeleton />
        </Page>
      }
    >
      <RecipeEditor key={id ?? 'new'} />
    </LazyRoute>
  )
}

// Keyed like the editor: another recipe starts at step 1.
function CookModeRoute() {
  const { id } = useParams()
  return (
    <LazyRoute title="Kochen" bare exit={{ to: `/recipes/${id}`, label: 'Zum Rezept' }} fallback={<CookSkeleton />}>
      <CookMode key={id} />
    </LazyRoute>
  )
}

// Keyed like the editor: another category starts with a fresh page (dialog, scroll).
function CategoryPageRoute() {
  const { id } = useParams()
  return (
    <LazyRoute
      title="Kategorie"
      exit={HOME}
      fallback={
        <Page className="pb-10 phone:pb-24">
          <CategoryPageSkeleton />
        </Page>
      }
    >
      <CategoryPage key={id} />
    </LazyRoute>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      {/* The timers, the catalog and the toasts live inside RequireAuth: timers belong to the signed-in user, and the
          sidebar and profile page need the categories and `me`, which need a session. Below it each route picks its
          frame; both frames share those providers, so timers and toasts survive the way into cook mode. */}
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route
            path="/login"
            element={
              <LazyRoute title="Anmelden" bare fallback={<AuthCardSkeleton />}>
                <Login />
              </LazyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <LazyRoute title="Konto anlegen" bare fallback={<AuthCardSkeleton />}>
                <Register />
              </LazyRoute>
            }
          />
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
            <Route
              path="/categories"
              element={
                <LazyRoute
                  title="Kategorien"
                  exit={HOME}
                  fallback={
                    <Page className="pb-10">
                      <CategoriesSkeleton />
                    </Page>
                  }
                >
                  <Categories />
                </LazyRoute>
              }
            />
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
