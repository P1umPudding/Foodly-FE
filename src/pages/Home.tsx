// The start page: greeting plus the sections (D2–D4), from 1100 px with "Geteilt mit dir" in a side column as in the
// mockup. While no section has content it shows the "nothing to show" card instead.
import { useMe } from '../catalog/CatalogProvider'
import { PageTitle } from '../components/PageTitle'
import { Page } from '../components/shell/Page'
import { CategoryTiles } from '../components/home/CategoryTiles'
import { HomeSectionsProvider, NothingToShow } from '../components/home/HomeSections'
import { formatHomeDate, greeting } from '../components/home/greeting'
import { RecentlyEdited } from '../components/home/RecentlyEdited'
import { SharedWithYou } from '../components/home/SharedWithYou'

export function Home() {
  const me = useMe()
  return (
    <HomeSectionsProvider>
      {/* Phone bottom padding clears the shell's "+" button (#74), as on the list. */}
      <Page className="flex flex-col gap-8 pb-10 phone:pb-24">
        <div className="mt-2 flex flex-col phone:mt-0">
          {/* Subtle although this is small text (design.md: subtle is below AA there): #242 names it explicitly, as
              in the mockup. */}
          <p className="text-sm/[1.5] font-medium text-subtle-foreground">{formatHomeDate(new Date())}</p>
          <PageTitle>{greeting(me?.name)}</PageTitle>
        </div>
        {/* Sections, each a HomeSection. */}
        <CategoryTiles />
        {/* An empty section renders nothing, so `:empty` means "this column has nothing to show": an empty column is
            hidden (no stray gap), the grid with no section at all too, and two columns only when both have content. */}
        <div className="grid gap-8 not-has-[section]:hidden min-[1100px]:not-has-[>:empty]:grid-cols-[minmax(0,1fr)_300px] min-[1100px]:not-has-[>:empty]:gap-x-10">
          <div data-slot="home-main" className="flex min-w-0 flex-col gap-8 empty:hidden">
            <RecentlyEdited />
          </div>
          <div data-slot="home-side" className="min-w-0 empty:hidden">
            <SharedWithYou />
          </div>
        </div>
        <NothingToShow />
      </Page>
    </HomeSectionsProvider>
  )
}
