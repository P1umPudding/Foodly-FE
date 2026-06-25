import { TagText } from '../TagText';
import { IngredientLine } from './IngredientLine';
import type { Section } from '../../api/protocol';

export function SectionBlock({ section }: { section: Section }) {
  return (
    <section className="mt-10">
      {section.name && (
        <h2 className="mb-4 font-display text-2xl text-foreground">
          <TagText value={section.name} size="md" />
        </h2>
      )}

      {/* Fixed splits, identical for every recipe/section: ingredients↔steps is a
          hard 1:1.85 (minmax(0,…) so content can't distort it); within the table
          the quantity column is a fixed width via the colgroup. leading-snug keeps
          wrapped lines tighter than the gap between items. Divider between them. */}
      <div className="grid grid-cols-1 gap-y-6 text-[0.95rem] leading-snug md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <table className="w-full table-fixed border-collapse md:pr-10">
          <colgroup>
            <col className="w-[8.5rem]" />
            <col />
          </colgroup>
          <tbody>
            {section.ingredients.map((line) => <IngredientLine key={line.id} line={line} />)}
          </tbody>
        </table>

        <ol className="space-y-2.5 md:border-l md:border-border md:pl-5">
          {section.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 tabular-nums text-foreground/70">{i + 1}.</span>
              <span className="min-w-0"><TagText value={step} /></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
