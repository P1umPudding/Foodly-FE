// Start page section "Kategorien" (D2): the user's categories as tinted tiles linking to their pages.
import { Link } from 'react-router-dom'
import { Skeleton } from '@postxl/ui-components'
import { useCategories } from '../../catalog/CatalogProvider'
import { categoryColorVars } from '../../lib/categoryColor'
import { CategoryMark } from '../category/CategoryMark'
import { categoryPageHref } from '../shell/nav'
import { HomeSection } from './HomeSection'
import type { SectionState } from './HomeSections'

const GRID = 'grid grid-cols-4 gap-3 phone:grid-cols-2'

const recipeCount = (n: number) => `${n} ${n === 1 ? 'Rezept' : 'Rezepte'}`

export function CategoryTiles() {
  const categories = useCategories()
  const ordered = [...categories.list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id)
  const state: SectionState =
    categories.status === 'ready' ? (ordered.length > 0 ? 'ready' : 'empty') : categories.status

  return (
    <HomeSection
      title="Kategorien"
      link={{ label: 'Verwalten', to: '/categories' }}
      state={state}
      onRetry={categories.retry}
      errorMessage={categories.error?.message}
      skeleton={
        <div className={GRID}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} data-testid="category-tile-skeleton" className="h-13 rounded-lg phone:h-11" />
          ))}
        </div>
      }
    >
      <ul className={GRID}>
        {ordered.map((c) => (
          <li key={c.id} className="min-w-0">
            <Link
              to={categoryPageHref(c.id)}
              {...categoryColorVars(c)}
              className="flex h-13 min-w-0 items-center gap-2.5 rounded-lg border border-cat-line bg-cat-soft pr-3.5 pl-2.5 font-semibold text-cat-ink transition-colors outline-none hover:border-cat-dot focus-visible:ring-[3px] focus-visible:ring-ring/50 phone:h-11"
            >
              {/* On the tinted tile the mark's own soft fill would vanish: it sits on the page surface instead. */}
              <CategoryMark category={c} size="md" className="bg-card dark:bg-background" />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span aria-hidden className="shrink-0 text-sm font-medium tabular-nums">
                {c.recipes.length}
              </span>
              <span className="sr-only">, {recipeCount(c.recipes.length)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  )
}
