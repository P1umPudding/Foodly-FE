// Start page section "Kategorien" (D2): the user's categories as borderless tinted tiles linking to their pages,
// an auto-fill grid on wider screens and one horizontally scrolling strip on phones (designer review 13.11.).
import { Link } from 'react-router-dom'
import { Skeleton } from '@postxl/ui-components'
import { useCategories } from '../../catalog/CatalogProvider'
import { categoryColorVars } from '../../lib/categoryColor'
import { CategoryMark } from '../category/CategoryMark'
import { categoryPageHref } from '../shell/nav'
import { HomeSection } from './HomeSection'
import type { SectionState } from './HomeSections'

// The strip bleeds to the screen edge (Home's phone:px-4); py-1 keeps the focus ring clear of the scroll clip.
const LAYOUT =
  'grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2 phone:-mx-4 phone:-my-1 phone:flex phone:overflow-x-auto phone:px-4 phone:py-1 phone:[scrollbar-width:none] phone:[&::-webkit-scrollbar]:hidden'

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
        <div className={LAYOUT}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              data-testid="category-tile-skeleton"
              className="h-13 rounded-lg phone:h-11 phone:w-36 phone:flex-none"
            />
          ))}
        </div>
      }
    >
      <ul className={LAYOUT}>
        {ordered.map((c) => (
          <li key={c.id} className="min-w-0 phone:max-w-[200px] phone:flex-none">
            <Link
              to={categoryPageHref(c.id)}
              {...categoryColorVars(c)}
              className="flex h-13 min-w-0 items-center gap-2.5 rounded-lg bg-cat-soft pr-3.5 pl-2.5 font-semibold text-cat-ink transition-[filter] outline-none hover:brightness-98 focus-visible:ring-[3px] focus-visible:ring-ring/50 phone:h-11 phone:pr-3"
            >
              {/* On the tinted tile the mark's own soft fill would vanish: it sits on the card surface, in dark mode on a
                  darkened tint instead (the mark sets its own --cat-soft). */}
              <CategoryMark
                category={c}
                size="md"
                className="size-8 rounded-md bg-card text-base/none font-bold phone:size-7 dark:bg-[color-mix(in_oklch,var(--cat-soft)_60%,black)]"
              />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {/* Faded as in the mockup only in dark mode: in light it would drop below AA for small text (design.md). */}
              <span aria-hidden className="shrink-0 text-sm font-medium tabular-nums dark:opacity-70">
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
