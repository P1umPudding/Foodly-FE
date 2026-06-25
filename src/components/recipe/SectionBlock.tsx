import { Separator } from '@postxl/ui-components';
import { TagText } from '../TagText';
import { IngredientLine } from './IngredientLine';
import type { Section } from '../../api/protocol';

export function SectionBlock({ section }: { section: Section }) {
  return (
    <section className="mt-8">
      {section.name && (
        <>
          <h2 className="text-lg font-medium"><TagText value={section.name} /></h2>
          <Separator className="mt-2 mb-4" />
        </>
      )}

      {/* Stack on mobile (ingredients then steps); 2 columns from md: up. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1.5fr]">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Zutaten</h3>
          <ul className="space-y-1">
            {section.ingredients.map((line) => <IngredientLine key={line.id} line={line} />)}
          </ul>
        </div>

        <div className="md:border-l md:pl-6">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Zubereitung</h3>
          <ol className="list-inside list-decimal space-y-1">
            {section.steps.map((step, i) => (
              <li key={i}><TagText value={step} /></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
