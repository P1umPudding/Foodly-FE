import { screen } from '@testing-library/react'

// Visible label text of every checkbox, in DOM order. postxl's Checkbox adds an empty label of its own,
// so all labels are joined.
export function checkboxLabels(): string[] {
  return screen.getAllByRole<HTMLInputElement>('checkbox').map((box) =>
    Array.from(box.labels ?? [])
      .map((l) => l.textContent)
      .join(''),
  )
}
