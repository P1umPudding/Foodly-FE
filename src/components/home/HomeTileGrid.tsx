// Recipe tiles on the start page: a fixed 3 columns (2 on phones) per the design spec, unlike the list's
// auto-fill grid, so a section of 6 fills two even rows.
import type { ReactNode } from 'react'

export function HomeTileGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-7 phone:grid-cols-2 phone:gap-x-3 phone:gap-y-5">{children}</div>
  )
}
