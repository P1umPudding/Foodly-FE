const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

export function formatHomeDate(date: Date): string {
  return DATE_FORMAT.format(date)
}

// First word of the name; a missing or blank name leaves just "Hallo".
export function greeting(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0]
  return first ? `Hallo ${first}` : 'Hallo'
}
