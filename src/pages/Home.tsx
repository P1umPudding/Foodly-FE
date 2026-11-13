// The start page: greeting plus the sections (D2–D4). While no section has content it shows the
// "nothing to show" card instead.
import { useMe } from '../catalog/CatalogProvider'
import { CategoryTiles } from '../components/home/CategoryTiles'
import { HomeSectionsProvider, NothingToShow } from '../components/home/HomeSections'
import { formatHomeDate, greeting } from '../components/home/greeting'

export function Home() {
  const me = useMe()
  return (
    <HomeSectionsProvider>
      {/* Phone bottom padding clears the shell's "+" button (#74), as on the list. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 phone:px-4 phone:py-6 phone:pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground">{formatHomeDate(new Date())}</p>
          <h1 className="font-display text-4xl text-foreground">{greeting(me?.name)}</h1>
        </div>
        {/* Sections, each a HomeSection (D3–D4 follow). */}
        <CategoryTiles />
        <NothingToShow />
      </div>
    </HomeSectionsProvider>
  )
}
