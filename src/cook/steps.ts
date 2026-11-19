// Cook mode walks the recipe's steps as one flat list. Steps are numbered across sections like the detail page
// (SectionBlock's stepOffset), so timer labels match on both pages; section names count, as there, only when the
// recipe has more than one section.
import type { Section } from '../api/protocol'

export type CookStep = {
  text: string
  // 1-based, across all sections.
  number: number
  sectionIndex: number
  sectionName: string | null
}

export function flattenSteps(sections: Section[]): CookStep[] {
  const named = sections.length > 1
  const out: CookStep[] = []
  sections.forEach((section, sectionIndex) => {
    const sectionName = (named && section.name?.trim()) || null
    for (const text of section.steps) out.push({ text, number: out.length + 1, sectionIndex, sectionName })
  })
  return out
}

// "Danach": the step after `index`, prefixed with its section's name where a new section begins. Null on the last.
export function nextStep(steps: CookStep[], index: number): { prefix: string | null; text: string } | null {
  const next = steps[index + 1]
  if (!next) return null
  const newSection = next.sectionIndex !== steps[index]?.sectionIndex
  return { prefix: newSection ? next.sectionName : null, text: next.text }
}
