// The start page's sections report their state here, so the page knows when it has nothing to show without
// knowing which sections exist (D2–D4 add sections without touching this logic).
import { createContext, useCallback, useContext, useId, useLayoutEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent } from '@postxl/ui-components'

export type SectionState = 'loading' | 'error' | 'empty' | 'ready'

type Report = (id: string, state: SectionState | undefined) => void

// Split so a section's report doesn't re-render every other section: only NothingToShow reads the states.
const ReportContext = createContext<Report | null>(null)
const StatesContext = createContext<Record<string, SectionState>>({})

export function HomeSectionsProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<Record<string, SectionState>>({})
  const report = useCallback<Report>((id, state) => {
    setStates((prev) => {
      if (prev[id] === state) return prev
      const next = { ...prev }
      if (state === undefined) delete next[id]
      else next[id] = state
      return next
    })
  }, [])
  return (
    <ReportContext.Provider value={report}>
      <StatesContext.Provider value={states}>{children}</StatesContext.Provider>
    </ReportContext.Provider>
  )
}

export function useReportSection(state: SectionState) {
  const report = useContext(ReportContext)
  const id = useId()
  // Layout effect: the registry is updated before paint, so a loading section never lets the
  // "nothing to show" card flash up.
  useLayoutEffect(() => {
    if (!report) return
    report(id, state)
    return () => report(id, undefined)
  }, [report, id, state])
}

function useNothingToShow(): boolean {
  return Object.values(useContext(StatesContext)).every((s) => s === 'empty')
}

export function NothingToShow() {
  if (!useNothingToShow()) return null
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 py-6">
        <p className="text-muted-foreground">
          Hier erscheinen deine Kategorien und Rezepte, die du zuletzt erstellt oder angesehen hast.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/recipes">Alle Rezepte</Link>
          </Button>
          <Button asChild>
            <Link to="/recipes/new">Neues Rezept</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
