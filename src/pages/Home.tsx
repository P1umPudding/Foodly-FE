// The start page: greeting plus the sections (D2–D4). While no section has content it shows the
// "nothing to show" card instead.
import { useMe } from '../catalog/CatalogProvider'
import { PageTitle } from '../components/PageTitle'
import { Page } from '../components/shell/Page'
import { CategoryTiles } from '../components/home/CategoryTiles'
import { HomeSectionsProvider, NothingToShow } from '../components/home/HomeSections'
import { formatHomeDate, greeting } from '../components/home/greeting'
import { RecentCreations } from '../components/home/RecentCreations'
import { RecentlyViewed } from '../components/home/RecentlyViewed'

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
        <RecentCreations />
        <RecentlyViewed />
        <NothingToShow />
      </Page>
    </HomeSectionsProvider>
  )
}
