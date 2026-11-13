import type { ReactNode } from 'react'
import { TagText } from '../TagText'
import { StepText } from './StepText'
import { IngredientLine } from './IngredientLine'
import type { RecipeIngredientId, Section } from '../../api/protocol'

export function SectionBlock({
  section,
  showTitle,
  recipeName,
  stepOffset,
  factor = 1,
  checkable = false,
  checkedIds,
  onToggle,
}: {
  section: Section
  // Only recipes with more than one section show section titles.
  showTitle: boolean
  recipeName: string
  // Steps in earlier sections: step numbers and timer labels count across the whole recipe, as in Koch-Modus.
  stepOffset: number
  factor?: number
  checkable?: boolean
  checkedIds?: ReadonlySet<RecipeIngredientId>
  onToggle?: (id: RecipeIngredientId) => void
}) {
  const title = showTitle ? section.name : null
  // Column titles sit one level below the section title, or take its place, so heading levels never skip.
  const columnLevel = title ? 3 : 2

  return (
    <section className="mt-10">
      {title && (
        // 19 px has no token in the text scale.
        <h2 className="mb-3.5 font-display text-[19px] leading-tight text-foreground">
          <TagText value={title} size="md" />
        </h2>
      )}

      {/* Fixed 2:3 split from lg (minmax(0,…) so content can't distort it). */}
      <div className="grid grid-cols-1 gap-y-6 text-lg lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-10">
        {section.ingredients.length > 0 && (
          // self-start: a stretched table spreads the extra height across its rows.
          <div className="self-start">
            <ColumnTitle level={columnLevel}>Zutaten</ColumnTitle>
            {/* border-collapse is what lets the rows draw their hairlines. */}
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                {checkable && <col className="w-8" />}
                {/* Under table-fixed the width includes the cell's pr-3: 84 px content plus a 12 px gap. */}
                <col className="w-24" />
                <col />
              </colgroup>
              <tbody>
                {section.ingredients.map((line) => (
                  <IngredientLine
                    key={line.id}
                    line={line}
                    factor={factor}
                    checkable={checkable}
                    checked={checkedIds?.has(line.id) ?? false}
                    onToggle={onToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {section.steps.length > 0 && (
          <div className="lg:col-start-2">
            <ColumnTitle level={columnLevel}>Zubereitung</ColumnTitle>
            {/* role: Safari drops list semantics from a list-style: none list. */}
            <ol role="list" className="space-y-3.5 leading-[1.55]">
              {section.steps.map((step, i) => {
                const n = stepOffset + i + 1
                return (
                  <li key={i} className="flex gap-2.5">
                    <span className="w-7 shrink-0">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs leading-none font-semibold tabular-nums text-muted-foreground">
                        {n}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <StepText value={step} timerLabel={`${recipeName} · Schritt ${n}`} />
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

function ColumnTitle({ level, children }: { level: 2 | 3; children: ReactNode }) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return <Heading className="mb-2 text-xs font-semibold text-muted-foreground">{children}</Heading>
}
