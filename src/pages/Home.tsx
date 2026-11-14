// The start page: greeting plus the sections (D2–D4). While no section has content it shows the
// "nothing to show" card instead.
import { useMe } from '../catalog/CatalogProvider'
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
      <Page className="flex flex-col gap-8 pb-10 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground">{formatHomeDate(new Date())}</p>
          <h1 className="font-display text-4xl text-foreground">{greeting(me?.name)}</h1>
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
